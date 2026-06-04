import { spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'public', 'dashboard-data.json');
const reportDir = path.join(root, 'test-artifacts', 'reports');
const htmlPath = path.join(reportDir, 'test-report.html');
const pdfPath = path.join(reportDir, 'test-report.pdf');

const statusOrder = ['FAIL', 'BLOCKED', 'PASS', 'NOT RUN'];
const statusLabel = {
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
  'NOT RUN': 'Ikke kjørt',
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

const escapeHtml = (value = '') =>
  polishNorwegianText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDate = (value) => {
  if (!value) return 'Ukjent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const runDashboardData = () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'generate-dashboard-data.mjs')], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error('Kunne ikke generere dashboard-data.');
  }
};

const statusPill = (status) => `<span class="pill ${escapeHtml(status.toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(statusLabel[status] ?? status)}</span>`;

const tableRows = (rows, columns) =>
  rows
    .map(
      (row) => `<tr>${columns
        .map((column) => `<td class="${column.className ?? ''}">${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`)
        .join('')}</tr>`,
    )
    .join('\n');

const link = (item, label = item?.label ?? item?.file ?? '') => {
  if (!item?.href) return escapeHtml(label);
  return `<a href="${escapeHtml(item.href)}">${escapeHtml(label)}</a>`;
};

const countBy = (items, key) =>
  items.reduce((acc, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const getArgValue = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? '' : process.argv[index + 1] ?? '';
};

const readSelectedExecutionFiles = async () => {
  const runsJson = getArgValue('--runs-json');
  const runs = getArgValue('--runs');
  if (runsJson) {
    const payload = JSON.parse(await fs.readFile(path.resolve(root, runsJson), 'utf8'));
    return Array.isArray(payload.executionFiles) ? payload.executionFiles : [];
  }
  if (runs) return runs.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const createSelectedReportData = (data, selectedExecutionFiles) => {
  if (!selectedExecutionFiles.length) {
    return {
      ...data,
      reportSelection: { mode: 'all', count: data.executions.length },
    };
  }

  const selected = new Set(selectedExecutionFiles.map((file) => file.replace(/\\/g, '/')));
  const executions = data.executions.filter((execution) => selected.has(execution.file));
  const executionsByTest = new Map();
  for (const execution of executions) {
    if (!executionsByTest.has(execution.id)) executionsByTest.set(execution.id, []);
    executionsByTest.get(execution.id).push(execution);
  }

  const tests = data.tests
    .filter((test) => executionsByTest.has(test.id))
    .map((test) => {
      const testExecutions = executionsByTest.get(test.id);
      const latestExecution = testExecutions[0];
      return {
        ...test,
        status: latestExecution.status,
        latestExecution,
        executionCount: testExecutions.length,
        evidenceCount: testExecutions.reduce((sum, execution) => sum + execution.evidence.length, 0),
        primaryEvidence: latestExecution.evidence.find((item) => /\.(png|jpg|jpeg|webp)$/i.test(item.file)) ?? test.primaryEvidence,
      };
    });

  const statusCounts = countBy(tests, 'status');
  const passRate = tests.length ? Math.round(((statusCounts.PASS ?? 0) / tests.length) * 100) : 0;
  const monitorScore = Math.max(0, Math.min(100, passRate - (statusCounts.BLOCKED ?? 0) * 2 - (statusCounts.FAIL ?? 0) * 5));

  return {
    ...data,
    generatedAt: new Date().toISOString(),
    tests,
    executions,
    reportSelection: { mode: 'selected', count: executions.length },
    summary: {
      ...data.summary,
      totalTests: tests.length,
      totalExecutions: executions.length,
      statusCounts,
      passRate,
      monitorScore,
      latestExecution: executions[0] ?? null,
      staleCount: tests.filter((test) => test.status !== 'PASS').length,
    },
  };
};

const buildHtml = (data) => {
  const statusCounts = data.summary.statusCounts ?? {};
  const openFindings = data.tests.filter((test) => ['FAIL', 'BLOCKED'].includes(test.status));
  const failedFindings = openFindings.filter((test) => test.status === 'FAIL');
  const notRun = data.tests.filter((test) => test.status === 'NOT RUN');
  const executedTests = data.tests.filter((test) => test.latestExecution);
  const recentExecutions = data.executions.slice(0, 20);
  const executionLogs = data.executions.filter((execution) => execution.log).slice(0, 12);

  const statusCards = statusOrder
    .map(
      (status) => `<div class="status-card ${status.toLowerCase().replace(/\s+/g, '-')}">
        <span>${escapeHtml(statusLabel[status])}</span>
        <strong>${statusCounts[status] ?? 0}</strong>
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <title>RetailSuite testrapport</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f6f8;
      color: #17212b;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    section, header {
      margin-bottom: 14px;
      border: 1px solid #d9e0e7;
      border-radius: 8px;
      background: #fff;
      padding: 18px;
    }
    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: end;
      border-top: 6px solid #1f66d1;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 34px; line-height: 1.05; }
    h2 { margin-bottom: 10px; font-size: 18px; }
    h3 { margin: 14px 0 7px; font-size: 14px; }
    .muted { color: #607080; }
    .kpi-grid, .status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .kpi, .status-card {
      min-height: 82px;
      padding: 12px;
      border-radius: 8px;
      background: #f8fafc;
    }
    .kpi span, .status-card span { display: block; color: #607080; font-weight: 700; }
    .kpi strong, .status-card strong { display: block; margin-top: 6px; font-size: 26px; }
    .status-card.pass strong { color: #188753; }
    .status-card.fail strong { color: #c9372c; }
    .status-card.blocked strong { color: #b06b00; }
    .status-card.not-run strong { color: #4b5f72; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      font-weight: 800;
      white-space: nowrap;
    }
    .pill.pass { color: #188753; background: #e5f6ed; }
    .pill.fail { color: #c9372c; background: #fdecea; }
    .pill.blocked { color: #b06b00; background: #fff3d6; }
    .pill.not-run { color: #4b5f72; background: #eef2f6; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 8px 7px;
      border-bottom: 1px solid #d9e0e7;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #607080;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .02em;
    }
    .id-cell { width: 72px; font-weight: 900; color: #1f66d1; }
    .status-cell { width: 92px; }
    .date-cell { width: 126px; color: #607080; }
    .summary-cell { color: #334155; }
    a { color: #1f66d1; text-decoration: none; }
    .log {
      max-height: 360px;
      overflow: hidden;
      white-space: pre-wrap;
      border: 1px solid #d9e0e7;
      border-radius: 8px;
      background: #111827;
      color: #e5e7eb;
      padding: 12px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10px;
    }
    .page-break { break-before: page; }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    ul { margin: 7px 0 0; padding-left: 18px; }
    @media print {
      body { background: #fff; }
      main { max-width: none; padding: 0; }
      section, header { box-shadow: none; break-inside: avoid; }
      .log { max-height: none; }
    }
  </style>
</head>
<body>
<main>
  <header>
    <div>
      <p class="muted">RetailSuite Testportal</p>
      <h1>Testrapport</h1>
      <p class="muted">Generert ${escapeHtml(formatDate(data.generatedAt))}</p>
      <p class="muted">${data.reportSelection?.mode === 'selected' ? `Basert på ${data.reportSelection.count} valgte test runs` : 'Basert på alle registrerte test runs'}</p>
    </div>
    <div>
      <p><strong>Miljø:</strong> Test</p>
      <p><strong>Siste kjøring:</strong> ${escapeHtml(formatDate(data.summary.latestExecution?.date))}</p>
    </div>
  </header>

  <section>
    <h2>Sammendrag</h2>
    <div class="kpi-grid">
      <div class="kpi"><span>Tester</span><strong>${data.summary.totalTests}</strong></div>
      <div class="kpi"><span>Kjøringer</span><strong>${data.summary.totalExecutions}</strong></div>
      <div class="kpi"><span>Passrate</span><strong>${data.summary.passRate}%</strong></div>
      <div class="kpi"><span>Åpne funn</span><strong>${openFindings.length}</strong></div>
    </div>
    <h3>Status</h3>
    <div class="status-grid">${statusCards}</div>
  </section>

  <section>
    <h2>Vurdering</h2>
    <div class="two-col">
      <div>
        <p><strong>${executedTests.length}</strong> av ${data.summary.totalTests} tester har minst én lokal execution.</p>
        <p><strong>${notRun.length}</strong> tester står fortsatt som ikke kjørt.</p>
      </div>
      <div>
        <p><strong>${openFindings.length}</strong> tester må følges opp før grønn helsesjekk.</p>
        <p>Monitor-score er <strong>${data.summary.monitorScore}</strong>.</p>
      </div>
    </div>
    ${
      failedFindings.length
        ? `<h3>Hva fungerte ikke</h3>
    <ul>${failedFindings
      .map(
        (test) =>
          `<li><strong>${escapeHtml(test.id)}:</strong> ${escapeHtml(
            test.latestExecution?.summary || test.latestExecution?.log || 'Testen feilet uten detaljert feiloppsummering.',
          )}</li>`,
      )
      .join('')}</ul>`
        : ''
    }
  </section>

  <section>
    <h2>Åpne funn</h2>
    ${
      openFindings.length
        ? `<table>
      <thead><tr><th>Test</th><th>Status</th><th>Tittel</th><th>Siste execution</th><th>Oppsummering</th></tr></thead>
      <tbody>${tableRows(openFindings, [
        { className: 'id-cell', render: (test) => escapeHtml(test.id) },
        { className: 'status-cell', render: (test) => statusPill(test.status) },
        { render: (test) => escapeHtml(test.title) },
        { className: 'date-cell', render: (test) => link(test.latestExecution, formatDate(test.latestExecution?.date)) },
        { className: 'summary-cell', render: (test) => escapeHtml(test.latestExecution?.summary || test.objective || '') },
      ])}</tbody>
    </table>`
        : '<p>Ingen åpne funn i gjeldende datagrunnlag.</p>'
    }
  </section>

  <section class="page-break">
    <h2>Siste kjøringer</h2>
    <table>
      <thead><tr><th>Test</th><th>Status</th><th>Dato</th><th>Oppsummering</th></tr></thead>
      <tbody>${tableRows(recentExecutions, [
        { className: 'id-cell', render: (execution) => escapeHtml(execution.id) },
        { className: 'status-cell', render: (execution) => statusPill(execution.status) },
        { className: 'date-cell', render: (execution) => link(execution, formatDate(execution.date)) },
        { className: 'summary-cell', render: (execution) => escapeHtml(execution.summary || '') },
      ])}</tbody>
    </table>
  </section>

  <section class="page-break">
    <h2>Testmatrise</h2>
    <table>
      <thead><tr><th>Test</th><th>Status</th><th>Tittel</th><th>Sist kjørt</th><th>Executioner</th><th>Automation</th></tr></thead>
      <tbody>${tableRows(data.tests, [
        { className: 'id-cell', render: (test) => escapeHtml(test.id) },
        { className: 'status-cell', render: (test) => statusPill(test.status) },
        { render: (test) => escapeHtml(test.title) },
        { className: 'date-cell', render: (test) => link(test.latestExecution, formatDate(test.latestExecution?.date)) },
        { render: (test) => escapeHtml(test.executionCount) },
        { render: (test) => escapeHtml(test.hasFullAutomation ? 'Full test' : test.automated ? 'Support' : 'Mangler') },
      ])}</tbody>
    </table>
  </section>

  <section class="page-break">
    <h2>Execution-logg</h2>
    ${executionLogs
      .map(
        (execution) => `<article>
      <h3>${escapeHtml(execution.id)} · ${escapeHtml(statusLabel[execution.status] ?? execution.status)} · ${escapeHtml(formatDate(execution.date))}</h3>
      <pre class="log">${escapeHtml(execution.log).slice(0, 12000)}</pre>
    </article>`,
      )
      .join('')}
  </section>
</main>
</body>
</html>`;
};

const writePdf = async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#607080;padding:0 14mm;display:flex;justify-content:space-between;"><span>RetailSuite testrapport</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
    margin: { top: '14mm', right: '14mm', bottom: '17mm', left: '14mm' },
  });
  await browser.close();
};

const main = async () => {
  runDashboardData();
  const rawData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const selectedExecutionFiles = await readSelectedExecutionFiles();
  const data = createSelectedReportData(rawData, selectedExecutionFiles);
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(htmlPath, buildHtml(data), 'utf8');

  const shouldWritePdf = process.argv.includes('--pdf');
  if (shouldWritePdf) {
    await writePdf();
  }

  console.log(`Report HTML: ${path.relative(root, htmlPath)}`);
  if (shouldWritePdf && existsSync(pdfPath)) console.log(`Report PDF: ${path.relative(root, pdfPath)}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
