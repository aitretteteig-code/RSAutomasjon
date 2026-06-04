import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    req.on('error', reject);
  });

const createInitialRun = () => ({
  active: false,
  runId: '',
  specFile: '',
  specFiles: [],
  label: '',
  command: '',
  headed: false,
  startedAt: '',
  completedAt: '',
  exitCode: null,
  status: 'idle',
  paused: false,
  pausedAt: '',
  pauseReason: '',
  workerCount: 1,
  output: '',
});

const createRunnerEnv = ({ headed, runId, workerCount = 1 }) =>
  Object.fromEntries(
    Object.entries({
      ...process.env,
      PW_HEADLESS: headed ? '0' : '1',
      PW_WORKERS: String(workerCount),
      PW_ENABLE_PORTAL_PAUSE: process.env.PW_ENABLE_PORTAL_PAUSE || '1',
      BROWSER_TEST_RUN_ID: runId,
      BROWSER_TEST_AGENT_RUN_ID: runId,
    }).filter(([key, value]) => key && !key.includes('\0') && value !== undefined && value !== null && !String(value).includes('\0')),
  );

const extractTestId = (value) => {
  const normalized = value.replace(/_/g, '-');
  const match = normalized.match(/\b([A-Z]+)-?(\d{1,3})\b/i);
  if (!match) return 'ADHOC';
  return `${match[1].toUpperCase()}-${match[2].padStart(3, '0')}`;
};

const extractTestIds = (value) => {
  const normalized = value.replace(/_/g, '-');
  const ids = [...normalized.matchAll(/\b([A-Z]+)-?(\d{1,3})\b/gi)].map(
    (match) => `${match[1].toUpperCase()}-${match[2].padStart(3, '0')}`,
  );
  return [...new Set(ids)];
};

const formatRunTimestamp = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const normalizeArtifactPath = (artifactPath) => artifactPath.replace(/\\/g, '/').replace(/^\.?\//, '');

const extractArtifactPaths = (output) => {
  const artifacts = new Set();
  const regex = /test-artifacts[\\/][^\s"'`]+/gi;
  for (const match of output.matchAll(regex)) {
    artifacts.add(normalizeArtifactPath(match[0]).replace(/[),.;:]+$/, ''));
  }
  return [...artifacts].slice(0, 20);
};

const markdownEscapeFence = (text) => text.replaceAll('```', "'''");

const safeReadJson = (filePath) => {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
};

const polishNorwegianText = (value = '') =>
  String(value)
    .replaceAll('Kjoring', 'Kjøring')
    .replaceAll('kjoring', 'kjøring')
    .replaceAll('kjor', 'kjør')
    .replaceAll('miljofeil', 'miljøfeil')
    .replaceAll('Miljofeil', 'Miljøfeil')
    .replaceAll('miljo', 'miljø')
    .replaceAll('Miljo', 'Miljø')
    .replaceAll('Naringsdeklarasjon', 'Næringsdeklarasjon')
    .replaceAll('naringsdeklarasjon', 'næringsdeklarasjon')
    .replaceAll('fullfort', 'fullført')
    .replaceAll('Fullfort', 'Fullført')
    .replaceAll('fullforing', 'fullføring')
    .replaceAll('Fullforing', 'Fullføring')
    .replaceAll('forsok', 'forsøk')
    .replaceAll('Forsok', 'Forsøk')
    .replaceAll(' forste ', ' første ')
    .replaceAll(' Forste ', ' Første ')
    .replaceAll(' se pa ', ' se på ')
    .replaceAll(' Se pa ', ' Se på ')
    .replaceAll(' vent pa ', ' vent på ')
    .replaceAll(' pa nytt', ' på nytt')
    .replaceAll(' bor ', ' bør ')
    .replaceAll(' Bor ', ' Bør ');

const extractDiagnosis = (output) => {
  const line = output
    .split(/\r?\n/)
    .find((item) => /\b(?:[A-Z]+-\d{3}|ADHOC)-DIAGNOSIS\s+\{/.test(item));
  if (!line) return null;
  const jsonStart = line.indexOf('{');
  if (jsonStart === -1) return null;
  try {
    return JSON.parse(line.slice(jsonStart));
  } catch {
    return null;
  }
};

const extractDiagnoses = (output) => {
  const diagnoses = new Map();
  const lines = output.split(/\r?\n/).filter((item) => /\b(?:[A-Z]+-\d{3}|ADHOC)-DIAGNOSIS\s+\{/.test(item));
  for (const line of lines) {
    const jsonStart = line.indexOf('{');
    if (jsonStart === -1) continue;
    try {
      const diagnosis = JSON.parse(line.slice(jsonStart));
      const testId = diagnosis.testId || line.match(/\b([A-Z]+-\d{3}|ADHOC)-DIAGNOSIS\b/)?.[1] || 'ADHOC';
      diagnoses.set(testId, diagnosis);
    } catch {
      // Ignore malformed diagnosis lines and keep any other diagnoses from the same run.
    }
  }
  return diagnoses;
};

const formatDiagnosisMarkdown = (diagnosis) => {
  if (!diagnosis) return '';
  const failedChecks = Array.isArray(diagnosis.failedChecks) ? diagnosis.failedChecks : [];
  const passedChecks = Array.isArray(diagnosis.passedChecks) ? diagnosis.passedChecks : [];
  const lines = [
    diagnosis.summary || 'Testen feilet, men ingen detaljert feiloppsummering ble registrert.',
    '',
  ];

  if (failedChecks.length) {
    lines.push('Feilet kontrollpunkt:');
    lines.push(...failedChecks.map((item) => `- ${item.title || item.key}: ${item.reason || 'Kontrollpunktet feilet.'}`));
    lines.push('');
  }

  if (diagnosis.productionId || diagnosis.productionUrl) {
    lines.push(`Produksjon: ${diagnosis.productionId || 'ukjent'}`);
    if (diagnosis.productionUrl) lines.push(`Produksjonslenke: ${diagnosis.productionUrl}`);
    lines.push('');
  }

  if (diagnosis.nextAction) {
    lines.push(`Anbefalt neste steg: ${diagnosis.nextAction}`);
    lines.push('');
  }

  if (diagnosis.classification || diagnosis.safeAction || diagnosis.playwrightAdvice) {
    lines.push('Browser Test Agent:');
    if (diagnosis.classification) {
      const confidence = Number.isFinite(diagnosis.confidence) ? ` (${Math.round(diagnosis.confidence * 100)}% sikkerhet)` : '';
      lines.push(`- Klassifisering: ${diagnosis.classification}${confidence}`);
    }
    if (diagnosis.safeAction) lines.push(`- Trygg handling: ${diagnosis.safeAction}`);
    if (diagnosis.playwrightAdvice) lines.push(`- Playwright-rad: ${diagnosis.playwrightAdvice}`);
    if (diagnosis.retry?.reason) {
      lines.push(`- Retry: ${diagnosis.retry.allowed ? 'kan vurderes' : 'ikke automatisk'} - ${diagnosis.retry.reason}`);
    }
    if (Array.isArray(diagnosis.selectorSuggestions) && diagnosis.selectorSuggestions.length) {
      lines.push(`- Mulige UI-ankere: ${diagnosis.selectorSuggestions.slice(0, 6).join(', ')}`);
    }
    if (diagnosis.agentEvidence) lines.push(`- Agent-evidence: ${diagnosis.agentEvidence}`);
    if (diagnosis.modelSkippedReason) lines.push(`- AI-modus: ${diagnosis.modelSkippedReason}`);
    lines.push('');
  }

  if (diagnosis.extraCheck) {
    lines.push(`Ekstra kontroll før konklusjon: ${diagnosis.extraCheck}`);
    lines.push('');
  }

  if (Array.isArray(diagnosis.consoleFindings) && diagnosis.consoleFindings.length) {
    lines.push('Relevante funn fra browser-console/nettverk:');
    lines.push(
      ...diagnosis.consoleFindings
        .slice(-8)
        .map((item) => `- ${item.type || 'console'}: ${item.text || ''}`),
    );
    lines.push('');
  }

  if (passedChecks.length) {
    lines.push(`Fungerte: ${passedChecks.join(', ')}`);
  }

  return polishNorwegianText(lines.join('\n').trim());
};

const escapeHtml = (value = '') =>
  polishNorwegianText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const statusFromDiagnosis = (diagnosis) => {
  if (!diagnosis) return 'Ukjent';
  const failedChecks = Array.isArray(diagnosis.failedChecks) ? diagnosis.failedChecks : [];
  return failedChecks.length ? 'FAIL' : 'PASS';
};

const listItemsHtml = (items, fallback, render = (item) => item) =>
  items.length
    ? `<ul>${items.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`
    : `<p class="muted">${escapeHtml(fallback)}</p>`;

const normalizeRelatedArtifacts = (diagnosis) => {
  const artifacts = diagnosis?.relatedArtifacts || diagnosis?.context?.relatedArtifacts || [];
  if (!Array.isArray(artifacts)) return [];
  return artifacts
    .map((artifact) => {
      if (typeof artifact === 'string') {
        return { label: path.basename(artifact), path: artifact };
      }
      return {
        label: artifact?.label || artifact?.path || 'Artefakt',
        path: artifact?.path || artifact?.href || '',
      };
    })
    .filter((artifact) => artifact.path)
    .slice(0, 12);
};

const formatAgentDiagnosisReport = ({ diagnosis, testId, completedAt, sourceSpecs, command }) => {
  const failedChecks = Array.isArray(diagnosis.failedChecks) ? diagnosis.failedChecks : [];
  const passedChecks = Array.isArray(diagnosis.passedChecks) ? diagnosis.passedChecks : [];
  const findings = Array.isArray(diagnosis.consoleFindings) ? diagnosis.consoleFindings : [];
  const confidence = Number.isFinite(diagnosis.confidence) ? `${Math.round(diagnosis.confidence * 100)}%` : 'ukjent';
  const screenshot = diagnosis.pageContext?.screenshot || '';
  const status = statusFromDiagnosis(diagnosis);
  const statusClass = status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'unknown';
  const productionUrl = diagnosis.productionUrl || diagnosis.context?.productionUrl || '';
  const productionId = diagnosis.productionId || diagnosis.context?.productionId || 'ikke registrert';
  const extraCheck = diagnosis.extraCheck || diagnosis.context?.extraCheck || 'ikke registrert';
  const relatedArtifacts = normalizeRelatedArtifacts(diagnosis);

  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <title>Agentrapport - ${escapeHtml(testId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f5f7;
      color: #17212b;
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.5;
    }
    main { max-width: 1120px; margin: 0 auto; padding: 28px; }
    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      padding: 24px;
      background: #fff;
      border: 1px solid #dce3ea;
      border-top: 6px solid #2f6fed;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 30px; letter-spacing: 0; }
    h2 { font-size: 18px; margin-bottom: 12px; }
    section {
      background: #fff;
      border: 1px solid #dce3ea;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .status {
      display: inline-flex;
      min-width: 92px;
      justify-content: center;
      padding: 8px 12px;
      border-radius: 999px;
      font-weight: 800;
    }
    .status.pass { color: #0f6b3f; background: #ddf4e8; }
    .status.fail { color: #a32020; background: #ffe2e2; }
    .status.unknown { color: #44546a; background: #edf1f5; }
    .summary { font-size: 20px; font-weight: 700; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .metric {
      padding: 14px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e3e9ef;
    }
    .metric span { display: block; color: #5d6b7a; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; overflow-wrap: anywhere; }
    ul { margin: 0; padding-left: 20px; }
    li + li { margin-top: 8px; }
    .ok li::marker { color: #188753; }
    .bad li::marker { color: #c9372c; }
    .muted { color: #627386; }
    .advice {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .advice div {
      padding: 14px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e3e9ef;
    }
    a { color: #1f66d1; }
    code, pre {
      font-family: Consolas, "Courier New", monospace;
      font-size: 13px;
    }
    pre {
      padding: 14px;
      overflow: auto;
      border-radius: 8px;
      background: #111827;
      color: #f8fafc;
    }
    .findings li { overflow-wrap: anywhere; }
    @media (max-width: 760px) {
      main { padding: 14px; }
      header, .grid, .metric-grid, .advice { display: block; }
      .metric, .advice div { margin-top: 10px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="muted">Browser Test Agent</p>
        <h1>Agentrapport - ${escapeHtml(testId)}</h1>
        <p class="muted">Dato: ${escapeHtml(completedAt)} | Kilde: ${escapeHtml(sourceSpecs.join(', '))}</p>
      </div>
      <span class="status ${statusClass}">${escapeHtml(status)}</span>
    </header>

    <section>
      <h2>Kort konklusjon</h2>
      <p class="summary">${escapeHtml(diagnosis.summary || 'Ingen oppsummering registrert.')}</p>
      <div class="metric-grid">
        <div class="metric"><span>Klassifisering</span><strong>${escapeHtml(diagnosis.classification || 'ukjent')}</strong></div>
        <div class="metric"><span>Sikkerhet</span><strong>${escapeHtml(confidence)}</strong></div>
        <div class="metric"><span>Produksjon</span><strong>${escapeHtml(productionId)}</strong></div>
        <div class="metric"><span>Retry</span><strong>${diagnosis.retry?.allowed ? 'Kan vurderes' : 'Ikke automatisk'}</strong></div>
      </div>
    </section>

    <div class="grid">
      <section class="ok">
        <h2>Dette fungerte</h2>
        ${listItemsHtml(passedChecks, 'Ingen passerte kontrollpunkter ble registrert.', escapeHtml)}
      </section>
      <section class="bad">
        <h2>Dette fungerte ikke</h2>
        ${listItemsHtml(
          failedChecks,
          'Ingen feilede kontrollpunkter ble registrert.',
          (item) => `<strong>${escapeHtml(item.title || item.key)}</strong>: ${escapeHtml(item.reason || 'Kontrollpunktet feilet.')}`,
        )}
      </section>
    </div>

    <section>
      <h2>Agentens vurdering</h2>
      <div class="advice">
        <div><strong>Trygg handling</strong><p>${escapeHtml(diagnosis.safeAction || 'Ikke angitt.')}</p></div>
        <div><strong>Anbefaling til Playwright</strong><p>${escapeHtml(diagnosis.playwrightAdvice || 'Ikke angitt.')}</p></div>
      </div>
      <p class="muted" style="margin-top:12px;">${escapeHtml(diagnosis.retry?.reason || '')}</p>
    </section>

    <section>
      <h2>Kontekst</h2>
      <ul>
        <li>Produksjon: ${escapeHtml(productionId)}</li>
        <li>Produksjonslenke: ${productionUrl ? `<a href="${escapeHtml(productionUrl)}">${escapeHtml(productionUrl)}</a>` : 'ikke registrert'}</li>
        <li>Ekstra kontroll: ${escapeHtml(extraCheck)}</li>
        <li>Skjermbilde: ${screenshot ? `<a href="/${escapeHtml(screenshot)}">${escapeHtml(screenshot)}</a>` : 'ikke registrert'}</li>
      </ul>
    </section>

    <section>
      <h2>Relaterte artefakter</h2>
      ${listItemsHtml(
        relatedArtifacts,
        'Ingen ekstra artefakter ble registrert.',
        (artifact) => `<a href="/${escapeHtml(artifact.path)}">${escapeHtml(artifact.label)}</a>`,
      )}
    </section>

    <section class="findings">
      <h2>Viktigste tekniske funn</h2>
      ${listItemsHtml(
        findings.slice(-8),
        'Ingen relevante console/nettverksfunn ble registrert.',
        (item) => {
          const url = item.location?.url ? ` (${item.location.url})` : '';
          return `<strong>${escapeHtml(item.type || 'funn')}</strong>: ${escapeHtml(item.text || '')}${escapeHtml(url)}`;
        },
      )}
    </section>

    <section>
      <h2>Neste steg</h2>
      <p>${escapeHtml(diagnosis.nextAction || 'Ingen neste steg registrert.')}</p>
    </section>

    <section>
      <h2>Kjøring</h2>
      <pre>${escapeHtml(command)}</pre>
    </section>
  </main>
</body>
</html>`;
};

const writeAgentDiagnosisReport = ({ projectRoot, diagnosis, testId, timestamp, completedAt, sourceSpecs, command }) => {
  if (!diagnosis) return null;
  const reportDir = path.join(projectRoot, 'test-artifacts', 'reports', 'agent-diagnoses');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${testId}-${timestamp}-agent-report.html`);
  writeFileSync(
    reportPath,
    formatAgentDiagnosisReport({ diagnosis, testId, completedAt, sourceSpecs, command }),
    'utf8',
  );
  return path.relative(projectRoot, reportPath).split(path.sep).join('/');
};

export function dashboardRunnerPlugin(projectRoot) {
  let activeProcess = null;
  let currentRun = createInitialRun();
  const testsRoot = path.resolve(projectRoot, 'test-artifacts', 'playwright', 'tests');
  const executionsRoot = path.resolve(projectRoot, 'test-artifacts', 'executions');
  const runtimeRoot = path.resolve(projectRoot, 'test-artifacts', 'runtime');
  const manualActionPath = path.join(runtimeRoot, 'manual-action-current.json');
  const pausePath = path.join(runtimeRoot, 'pause-current.json');

  const appendOutput = (chunk) => {
    currentRun.output = `${currentRun.output}${chunk.toString()}`;
    if (currentRun.output.length > 18_000) {
      currentRun.output = currentRun.output.slice(-18_000);
    }
  };

  const validateSpec = (specFile) => {
    if (typeof specFile !== 'string' || !specFile.trim()) {
      throw new Error('Mangler spec-fil.');
    }

    const absoluteSpec = path.resolve(projectRoot, specFile);
    const relativeToTests = path.relative(testsRoot, absoluteSpec);
    const isInsideTests = relativeToTests && !relativeToTests.startsWith('..') && !path.isAbsolute(relativeToTests);
    const isSpec = absoluteSpec.endsWith('.spec.js');

    if (!isInsideTests || !isSpec || !existsSync(absoluteSpec)) {
      throw new Error('Spec-filen er ikke en gyldig lokal Playwright-test.');
    }

    return path.relative(projectRoot, absoluteSpec).split(path.sep).join('/');
  };

  const validateSpecs = (specFiles) => {
    const files = Array.isArray(specFiles) ? specFiles : [];
    if (!files.length) {
      throw new Error('Mangler spec-fil.');
    }
    return [...new Set(files.map(validateSpec))];
  };

  const validateExecutionFiles = (executionFiles) => {
    if (!Array.isArray(executionFiles)) {
      throw new Error('Rapporten må ha en liste med valgte test runs.');
    }
    if (executionFiles.length === 0) {
      throw new Error('Velg minst én test run før rapporten genereres.');
    }
    return executionFiles.map((executionFile) => {
      if (typeof executionFile !== 'string' || !executionFile.trim()) {
        throw new Error('Ugyldig execution-valg.');
      }

      const absoluteExecution = path.resolve(projectRoot, executionFile);
      const relativeToExecutions = path.relative(executionsRoot, absoluteExecution);
      const isInsideExecutions = relativeToExecutions && !relativeToExecutions.startsWith('..') && !path.isAbsolute(relativeToExecutions);
      const isMarkdown = absoluteExecution.endsWith('.md');

      if (!isInsideExecutions || !isMarkdown || !existsSync(absoluteExecution)) {
        throw new Error('Execution-filen er ikke gyldig.');
      }

      return path.relative(projectRoot, absoluteExecution).split(path.sep).join('/');
    });
  };

  const refreshDashboardData = () => {
    const node = process.execPath;
    const script = path.join(projectRoot, 'scripts', 'generate-dashboard-data.mjs');
    const refresh = spawn(node, [script], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: 'ignore',
    });
    refresh.unref();
  };

  const clearManualAction = () => {
    try {
      rmSync(manualActionPath, { force: true });
    } catch {
      // Nothing to clear.
    }
  };

  const clearPauseAction = () => {
    try {
      rmSync(pausePath, { force: true });
    } catch {
      // Nothing to clear.
    }
  };

  const pauseActiveRun = (reason = '') => {
    if (!currentRun.active || !activeProcess) {
      throw new Error('Ingen aktiv test kan pauses.');
    }
    if (currentRun.status === 'stopping') {
      throw new Error('Kan ikke pause en test som stopper.');
    }

    mkdirSync(runtimeRoot, { recursive: true });
    const pausedAt = new Date().toISOString();
    const payload = {
      status: 'paused',
      runId: currentRun.runId,
      specFile: currentRun.specFile,
      specFiles: currentRun.specFiles,
      reason: typeof reason === 'string' ? reason.trim().slice(0, 300) : '',
      pausedAt,
    };
    writeFileSync(pausePath, JSON.stringify(payload, null, 2), 'utf8');
    currentRun = {
      ...currentRun,
      status: 'paused',
      paused: true,
      pausedAt,
      pauseReason: payload.reason,
    };
    appendOutput(`\nRUN_PAUSE_REQUESTED ${JSON.stringify({ runId: currentRun.runId, at: pausedAt })}\n`);
    return currentRun;
  };

  const resumeActiveRun = () => {
    if (!currentRun.active || !activeProcess) {
      clearPauseAction();
      throw new Error('Ingen aktiv test kan fortsettes.');
    }

    clearPauseAction();
    currentRun = {
      ...currentRun,
      status: 'running',
      paused: false,
      pausedAt: '',
      pauseReason: '',
    };
    appendOutput(`\nRUN_RESUME_REQUESTED ${JSON.stringify({ runId: currentRun.runId, at: new Date().toISOString() })}\n`);
    return currentRun;
  };

  const readManualAction = () => {
    const action = safeReadJson(manualActionPath);
    if (!action || action.status !== 'pending') {
      return { pending: false };
    }
    return {
      pending: true,
      id: action.id,
      testId: action.testId ?? '',
      title: action.title ?? '',
      message: action.message ?? '',
      details: Array.isArray(action.details) ? action.details : [],
      startedAt: action.startedAt ?? '',
    };
  };

  const resolveManualAction = (body) => {
    const action = safeReadJson(manualActionPath);
    if (!action || action.status !== 'pending') {
      throw new Error('Ingen manuell handling venter nå.');
    }

    const status = body?.status === 'failed' ? 'failed' : body?.status === 'completed' ? 'completed' : '';
    if (!status) {
      throw new Error('Velg om handlingen er gjennomført eller feilet.');
    }

    const responseFile = path.resolve(String(action.responseFile || ''));
    const relativeToRuntime = path.relative(runtimeRoot, responseFile);
    const isInsideRuntime = relativeToRuntime && !relativeToRuntime.startsWith('..') && !path.isAbsolute(relativeToRuntime);
    if (!isInsideRuntime) {
      throw new Error('Manuell handling har ugyldig responsfil.');
    }

    mkdirSync(runtimeRoot, { recursive: true });
    writeFileSync(
      responseFile,
      JSON.stringify(
        {
          id: action.id,
          status,
          note: typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '',
          respondedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    return { pending: false, status };
  };

  const writePortalExecution = (run) => {
    if (!run.specFile || !run.completedAt || run.status === 'idle') return;

    const completedAt = new Date(run.completedAt);
    const timestamp = formatRunTimestamp(Number.isNaN(completedAt.getTime()) ? new Date() : completedAt);
    const sourceSpecs = run.specFiles?.length ? run.specFiles : [run.specFile];
    const status = run.status === 'passed' ? 'PASS' : run.status === 'failed' || run.status === 'error' ? 'FAIL' : 'BLOCKED';
    const executionDir = path.join(projectRoot, 'test-artifacts', 'executions');
    const testIds = extractTestIds(sourceSpecs.join(' '));
    const executionTestIds = testIds.length ? testIds : [extractTestId(run.specFile)];
    const artifacts = extractArtifactPaths(run.output);
    const output = markdownEscapeFence(run.output.trim()).slice(-8000);
    const diagnoses = extractDiagnoses(run.output);
    const firstDiagnosis = diagnoses.values().next().value || extractDiagnosis(run.output);

    mkdirSync(executionDir, { recursive: true });
    for (const testId of executionTestIds) {
      const diagnosis = diagnoses.get(testId) || firstDiagnosis || null;
      const failureMarkdown = run.status === 'failed' ? formatDiagnosisMarkdown(diagnosis) : '';
      const title = run.label ? `${run.label} (${testId})` : `${testId} Portal run`;
      const executionPath = path.join(executionDir, `${testId}-${timestamp}-portal-run.md`);
      const agentReport = writeAgentDiagnosisReport({
        projectRoot,
        diagnosis,
        testId,
        timestamp,
        completedAt: run.completedAt,
        sourceSpecs,
        command: run.command,
      });
      const evidenceMarkdown = agentReport
        ? `- \`${agentReport}\``
        : artifacts.length
          ? artifacts.map((artifact) => `- \`${artifact}\``).join('\n')
          : '- No Playwright artifact paths were reported.';
      writeFileSync(
        executionPath,
        `# Execution - ${title}

Status: ${status}
Date: ${run.completedAt}
Run ID: ${run.runId}
Environment: Test
Runner: Portal / Playwright
Source spec: ${sourceSpecs.join(', ')}

## Result

Portal-runner finished ${sourceSpecs.length} spec(s) with status \`${run.status}\` and exit code \`${run.exitCode ?? 'n/a'}\`.

${failureMarkdown ? `## Failure\n\n${failureMarkdown}\n\n` : ''}## Evidence

${evidenceMarkdown}

## Command

\`\`\`text
${run.command}
\`\`\`

## Output

\`\`\`text
${output || 'No output captured.'}
\`\`\`
`,
        'utf8',
      );
    }
  };

  const generateReport = (executionFiles) => {
    const reportDir = path.join(projectRoot, 'test-artifacts', 'reports');
    mkdirSync(reportDir, { recursive: true });
    const selectionPath = path.join(reportDir, '.report-selection.json');
    writeFileSync(selectionPath, JSON.stringify({ executionFiles }, null, 2), 'utf8');

    const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'generate-test-report.mjs'), '--pdf', '--runs-json', selectionPath], {
      cwd: projectRoot,
      encoding: 'utf8',
      windowsHide: true,
    });

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'Kunne ikke generere rapport.');
    }

    return {
      status: 'generated',
      selectedRuns: executionFiles.length,
      html: '/test-artifacts/reports/test-report.html',
      pdf: '/test-artifacts/reports/test-report.pdf',
      output: result.stdout,
    };
  };

  const stopActiveProcess = () => {
    if (!activeProcess) return false;

    const child = activeProcess;
    currentRun = {
      ...currentRun,
      status: 'stopping',
      paused: false,
      pausedAt: '',
    };
    clearPauseAction();

    if (process.platform === 'win32' && child.pid) {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });

      killer.on('error', () => {
        child.kill();
      });
      return true;
    }

    child.kill('SIGTERM');
    return true;
  };

  return {
    name: 'retailsuite-dashboard-runner',
    configureServer(server) {
      server.middlewares.use('/api/manual-action', async (req, res) => {
        try {
          if (req.method === 'GET') {
            json(res, 200, readManualAction());
            return;
          }

          if (req.method === 'POST') {
            const body = await readBody(req);
            json(res, 200, resolveManualAction(body));
            return;
          }

          json(res, 405, { message: 'Metode ikke støttet.' });
        } catch (error) {
          json(res, 400, { message: error.message });
        }
      });

      server.middlewares.use('/api/test-report', async (req, res) => {
        try {
          if (req.method !== 'POST') {
            json(res, 405, { message: 'Metode ikke støttet.' });
            return;
          }

          const body = await readBody(req);
          const executionFiles = validateExecutionFiles(body?.executionFiles);
          json(res, 200, generateReport(executionFiles));
        } catch (error) {
          json(res, 400, { message: error.message });
        }
      });

      server.middlewares.use('/api/test-run', async (req, res) => {
        try {
          if (req.method === 'GET') {
            json(res, 200, currentRun);
            return;
          }

          if (req.method === 'POST') {
            const body = await readBody(req);

            if (body?.action === 'pause') {
              json(res, 200, pauseActiveRun(body?.reason));
              return;
            }

            if (body?.action === 'resume') {
              json(res, 200, resumeActiveRun());
              return;
            }

            if (body?.action === 'stop') {
              if (stopActiveProcess()) {
                json(res, 200, currentRun);
                return;
              }
              if (currentRun.active) {
                currentRun = {
                  ...currentRun,
                  active: false,
                  status: 'stopped',
                  completedAt: new Date().toISOString(),
                };
              }
              json(res, 200, currentRun);
              return;
            }

            if (activeProcess) {
              json(res, 409, { message: 'En test kjører allerede.', run: currentRun });
              return;
            }

            const specFiles = validateSpecs(Array.isArray(body?.specFiles) ? body.specFiles : [body?.specFile]);
            const specFile = specFiles[0];
            const requiresVisibleBrowser = specFiles.some((file) => /hc-018-monitor-queues\.spec\.js$/i.test(file));
            const headed = requiresVisibleBrowser || Boolean(body?.headed);
            const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 120) : '';
            const maxPortalWorkers = Math.max(1, Number(process.env.PORTAL_MAX_PARALLEL_TESTS || 2));
            const requestedWorkers = Math.max(1, Number(body?.workers || maxPortalWorkers));
            const workerCount = requiresVisibleBrowser ? 1 : Math.min(specFiles.length, maxPortalWorkers, requestedWorkers);
            const displayCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
            const args = ['playwright', 'test', ...specFiles, '--project=edge'];
            if (workerCount > 1) args.push(`--workers=${workerCount}`);
            if (headed) args.push('--headed');
            const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
            const spawnArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npx.cmd', ...args] : args;

            currentRun = {
              ...createInitialRun(),
              active: true,
              runId: `${Date.now()}`,
              specFile,
              specFiles,
              label,
              command: `${displayCommand} ${args.join(' ')}`,
              headed,
              workerCount,
              startedAt: new Date().toISOString(),
              status: 'running',
            };
            clearManualAction();
            clearPauseAction();

            try {
              activeProcess = spawn(command, spawnArgs, {
                cwd: projectRoot,
                env: createRunnerEnv({ headed, runId: currentRun.runId, workerCount }),
                windowsHide: !headed,
              });
            } catch (spawnError) {
              currentRun = {
                ...currentRun,
                active: false,
                status: 'error',
                paused: false,
                pausedAt: '',
                completedAt: new Date().toISOString(),
                output: spawnError.message,
              };
              clearPauseAction();
              throw spawnError;
            }

            activeProcess.stdout.on('data', appendOutput);
            activeProcess.stderr.on('data', appendOutput);
            activeProcess.on('error', (error) => {
              appendOutput(`\n${error.message}\n`);
              currentRun = {
                ...currentRun,
                active: false,
                status: 'error',
                paused: false,
                pausedAt: '',
                completedAt: new Date().toISOString(),
              };
              activeProcess = null;
              clearPauseAction();
            });
            activeProcess.on('close', (exitCode) => {
              const wasStopped = currentRun.status === 'stopping';
              currentRun = {
                ...currentRun,
                active: false,
                exitCode,
                status: wasStopped ? 'stopped' : exitCode === 0 ? 'passed' : 'failed',
                paused: false,
                pausedAt: '',
                completedAt: new Date().toISOString(),
              };
              activeProcess = null;
              clearManualAction();
              clearPauseAction();
              writePortalExecution(currentRun);
              refreshDashboardData();
            });

            json(res, 202, currentRun);
            return;
          }

          json(res, 405, { message: 'Metode ikke støttet.' });
        } catch (error) {
          json(res, 400, { message: error.message });
        }
      });
    },
  };
}
