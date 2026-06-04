import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const getArgValue = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? '' : process.argv[index + 1] ?? '';
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

const statusFromDiagnosis = (diagnosis) => {
  const failedChecks = Array.isArray(diagnosis.failedChecks) ? diagnosis.failedChecks : [];
  return failedChecks.length ? 'FAIL' : 'PASS';
};

const listItemsHtml = (items, fallback, render = (item) => item) =>
  items.length
    ? `<ul>${items.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`
    : `<p class="muted">${escapeHtml(fallback)}</p>`;

const formatReport = ({ diagnosis, command = '' }) => {
  const testId = diagnosis.testId || 'ADHOC';
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

  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <title>Agentrapport - ${escapeHtml(testId)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f5f7; color: #17212b; font-family: "Segoe UI", Arial, sans-serif; line-height: 1.5; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding: 24px; background: #fff; border: 1px solid #dce3ea; border-top: 6px solid #2f6fed; border-radius: 8px; margin-bottom: 16px; }
    h1, h2, p { margin: 0; } h1 { font-size: 30px; letter-spacing: 0; } h2 { font-size: 18px; margin-bottom: 12px; }
    section { background: #fff; border: 1px solid #dce3ea; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .status { display: inline-flex; min-width: 92px; justify-content: center; padding: 8px 12px; border-radius: 999px; font-weight: 800; }
    .status.pass { color: #0f6b3f; background: #ddf4e8; } .status.fail { color: #a32020; background: #ffe2e2; } .status.unknown { color: #44546a; background: #edf1f5; }
    .summary { font-size: 20px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .metric { padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #e3e9ef; }
    .metric span { display: block; color: #5d6b7a; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; overflow-wrap: anywhere; }
    ul { margin: 0; padding-left: 20px; } li + li { margin-top: 8px; }
    .ok li::marker { color: #188753; } .bad li::marker { color: #c9372c; } .muted { color: #627386; }
    .advice { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .advice div { padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #e3e9ef; }
    a { color: #1f66d1; } code, pre { font-family: Consolas, "Courier New", monospace; font-size: 13px; }
    pre { padding: 14px; overflow: auto; border-radius: 8px; background: #111827; color: #f8fafc; }
    .findings li { overflow-wrap: anywhere; }
    @media (max-width: 760px) { main { padding: 14px; } header, .grid, .metric-grid, .advice { display: block; } .metric, .advice div { margin-top: 10px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="muted">Browser Test Agent</p>
        <h1>Agentrapport - ${escapeHtml(testId)}</h1>
        <p class="muted">Run ID: ${escapeHtml(diagnosis.runId || 'ukjent')}</p>
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
      <section class="ok"><h2>Dette fungerte</h2>${listItemsHtml(passedChecks, 'Ingen passerte kontrollpunkter ble registrert.', escapeHtml)}</section>
      <section class="bad"><h2>Dette fungerte ikke</h2>${listItemsHtml(failedChecks, 'Ingen feilede kontrollpunkter ble registrert.', (item) => `<strong>${escapeHtml(item.title || item.key)}</strong>: ${escapeHtml(item.reason || 'Kontrollpunktet feilet.')}`)}</section>
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
    <section class="findings">
      <h2>Viktigste tekniske funn</h2>
      ${listItemsHtml(findings.slice(-8), 'Ingen relevante console/nettverksfunn ble registrert.', (item) => {
        const url = item.location?.url ? ` (${item.location.url})` : '';
        return `<strong>${escapeHtml(item.type || 'funn')}</strong>: ${escapeHtml(item.text || '')}${escapeHtml(url)}`;
      })}
    </section>
    <section><h2>Neste steg</h2><p>${escapeHtml(diagnosis.nextAction || 'Ingen neste steg registrert.')}</p></section>
    ${command ? `<section><h2>Kjøring</h2><pre>${escapeHtml(command)}</pre></section>` : ''}
  </main>
</body>
</html>`;
};

const main = async () => {
  const diagnosisArg = getArgValue('--diagnosis');
  if (!diagnosisArg) {
    throw new Error('Bruk: node scripts/generate-agent-diagnosis-report.mjs --diagnosis <path> [--command "..."]');
  }

  const diagnosisPath = path.resolve(root, diagnosisArg);
  const diagnosis = JSON.parse(await fs.readFile(diagnosisPath, 'utf8'));
  const testId = diagnosis.testId || 'ADHOC';
  const runId = diagnosis.runId || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const reportDir = path.join(root, 'test-artifacts', 'reports', 'agent-diagnoses');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${testId}-${runId}-agent-report.html`);
  await fs.writeFile(reportPath, formatReport({ diagnosis, command: getArgValue('--command') }), 'utf8');
  console.log(path.relative(root, reportPath).split(path.sep).join('/'));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
