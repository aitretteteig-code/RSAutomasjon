const fs = require('fs');
const path = require('path');

const MONITOR_QUEUE_URL =
  process.env.RS_MONITOR_MQ_URL || 'https://rsbutikk-blue.test.ngdata.no/retailsuite/monitor/#/vri/vri/mq';

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function relPath(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function classifyQueue(name) {
  if (/poison/i.test(name)) return 'Poison';
  if (/Journal/i.test(name)) return 'Journal';
  return 'Aktiv/vanlig';
}

function extractQueuePairsFromText(bodyText) {
  const lines = String(bodyText || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const queues = [];
  const seen = new Set();

  for (let index = 0; index < lines.length - 1; index += 1) {
    const name = normalize(lines[index]);
    const countText = normalize(lines[index + 1]);
    if (!/^-?\d+$/.test(countText)) continue;
    if (!/_/.test(name)) continue;
    if (/^(Search|Journal|Poison|Empty|Create Queue)$/i.test(name)) continue;

    const key = `${name}:${countText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queues.push({
      name,
      count: Number(countText),
      type: classifyQueue(name),
    });
  }

  return queues.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function summarizeQueues(queues) {
  const nonZero = queues.filter((queue) => queue.count > 0);
  const poison = nonZero.filter((queue) => queue.type === 'Poison');
  const journal = nonZero.filter((queue) => queue.type === 'Journal');
  const totalMessages = nonZero.reduce((sum, queue) => sum + queue.count, 0);
  const topQueues = nonZero.slice(0, 14);

  return {
    queueCount: queues.length,
    nonZeroCount: nonZero.length,
    poisonCount: poison.length,
    journalCount: journal.length,
    totalMessages,
    topQueues,
    poisonQueues: poison,
  };
}

function queueInterpretation(name) {
  if (/customervriplugin_customersexport/i.test(name)) {
    return {
      does: 'Eksport av kundedata eller kundehendelser fra VRI/RS til andre systemer.',
      check: 'Sjekk customer VRI plugin, eksportkonsument, mottakersystem og om køen drenerer eller vokser.',
    };
  }
  if (/pickandcollect_pnc_externalexport/i.test(name)) {
    return {
      does: 'Ekstern eksport for Pick and Collect, typisk ordre-, status- eller grunnlagsdata mot PnC/nettbutikk.',
      check: 'Sjekk PnC-konsument, preprod-endepunkt, siste feilmelding og om eksportjobben faktisk prosesserer.',
    };
  }
  if (/applicationparameters_externalimport/i.test(name)) {
    return {
      does: 'Import av applikasjonsparametere og konfigurasjonsdata fra ekstern kilde.',
      check: 'Sjekk importjobb, datavalidering og eventuelle schema- eller formatendringer.',
    };
  }
  if (/rsconnector_msgfromvismars_rsconncustomer/i.test(name)) {
    return {
      does: 'Kundemeldinger fra Visma/RS Connector inn i RS/VRI.',
      check: 'Sjekk connector, abonnement/konsument og om meldingene feiler på format eller downstream-behandling.',
    };
  }
  if (/poison/i.test(name)) {
    return {
      does: 'Feilede meldinger som er flyttet til poison fordi ordinær behandling ikke lyktes.',
      check: 'Åpne representative meldinger read-only, noter exception/payload, korriger rotårsak før replay eller rydding vurderes.',
    };
  }
  if (/Journal/i.test(name)) {
    return {
      does: 'Journal-/historikkspor for meldinger i tilknyttet integrasjonsflyt.',
      check: 'Sjekk om volumet er forventet historikk, eller om journalen peker på en stoppet flyt.',
    };
  }
  return {
    does: 'Integrasjonskø for domenet som ligger i kønavnet.',
    check: 'Sjekk tilhørende plugin/konsument, siste feil og om antallet går ned ved ny refresh.',
  };
}

function tableRows(queues) {
  return queues
    .map(
      (queue) =>
        `<tr><td>${escapeHtml(queue.name)}</td><td class="num">${queue.count}</td><td>${escapeHtml(queue.type)}</td></tr>`,
    )
    .join('\n');
}

function interpretationRows(queues) {
  return queues
    .map((queue) => {
      const interpretation = queueInterpretation(queue.name);
      return `<tr><td>${escapeHtml(queue.name)}</td><td>${escapeHtml(interpretation.does)}</td><td>${escapeHtml(interpretation.check)}</td></tr>`;
    })
    .join('\n');
}

function formatMonitorQueueReport({ queues, screenshotPath, monitorUrl, createdAt = new Date().toISOString(), confluenceStatus = '' }) {
  const summary = summarizeQueues(queues);
  const reportDir = path.resolve('test-artifacts/reports/agent-diagnoses');
  const screenshotHref = screenshotPath ? path.relative(reportDir, screenshotPath).split(path.sep).join('/') : '';
  const statusClass = summary.poisonCount || summary.nonZeroCount > 0 ? 'bad' : 'ok';
  const statusLabel = summary.poisonCount || summary.nonZeroCount > 0 ? 'Må følges opp' : 'Ser grønt ut';

  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HC-018 Message Queue rapport</title>
  <style>
    :root { color-scheme: light; --ink:#16202a; --muted:#5f6b7a; --line:#d8dee8; --bg:#f6f7f9; --panel:#fff; --accent:#9b1b8f; --warn:#a65f00; --bad:#b42318; --ok:#067647; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui,-apple-system,"Segoe UI",Arial,sans-serif; }
    header { background:#07111f; color:#fff; padding:24px 32px; }
    main { max-width:1180px; margin:0 auto; padding:24px 24px 48px; }
    h1 { margin:4px 0 6px; font-size:28px; letter-spacing:0; }
    h2 { margin:0 0 12px; font-size:18px; }
    p { margin:0 0 10px; }
    .kicker { color:#eeb7e9; font-weight:700; text-transform:uppercase; font-size:12px; letter-spacing:.08em; }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:18px 0; }
    .metric, .section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    .metric strong { display:block; font-size:24px; }
    .metric span, .note { color:var(--muted); }
    .section { margin-top:16px; }
    .status { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; font-weight:700; font-size:12px; }
    .status.bad { background:#fee4e2; color:var(--bad); }
    .status.ok { background:#dcfae6; color:var(--ok); }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:9px 10px; vertical-align:top; }
    th { background:#f1f3f6; font-size:12px; text-transform:uppercase; }
    .num { text-align:right; font-variant-numeric:tabular-nums; }
    img { max-width:100%; border:1px solid var(--line); border-radius:8px; background:#fff; }
    details { margin-top:10px; }
    summary { cursor:pointer; font-weight:700; color:var(--accent); }
    .split { display:grid; grid-template-columns:1.1fr .9fr; gap:16px; }
    .callout { border-left:4px solid var(--accent); padding:10px 12px; background:#fff; border-radius:6px; }
    code { font-family:Consolas,"Courier New",monospace; }
    @media (max-width:800px) { .grid,.split { grid-template-columns:1fr; } header { padding:20px; } main { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <div class="kicker">Read-only diagnose</div>
    <h1>HC-018 Message Queue</h1>
    <div>RS Monitor VRI / Message Queue, ${escapeHtml(new Date(createdAt).toLocaleString('nb-NO'))}</div>
  </header>
  <main>
    <div class="grid">
      <div class="metric"><strong>${summary.queueCount}</strong><span>kølinjer funnet</span></div>
      <div class="metric"><strong>${summary.nonZeroCount}</strong><span>køer med meldinger</span></div>
      <div class="metric"><strong>${summary.totalMessages}</strong><span>meldinger totalt</span></div>
      <div class="metric"><strong>${summary.poisonCount}</strong><span>poison-køer med meldinger</span></div>
    </div>

    <section class="section">
      <h2>Konklusjon</h2>
      <p><span class="status ${statusClass}">${statusLabel}</span></p>
      <p>${summary.nonZeroCount ? 'Monitoren er tilgjengelig, men købildet er ikke helt grønt. Køer med meldinger bør følges opp, spesielt poison-køer og store backlog-køer.' : 'Monitoren er tilgjengelig, og ingen køer med meldinger ble funnet med valgte filtre.'}</p>
      <p class="note">Dette er en read-only rapport. Testen har kun åpnet monitoren, satt visningsfiltre, tatt skjermbilde og lest køverdier.</p>
      <p class="note">${escapeHtml(confluenceStatus || 'Confluence-oppslag er ikke kjørt fra portalen. Bruk tolkningen som lokal diagnose inntil Confluence-kobling er tilgjengelig.')}</p>
      <p class="note">Monitor: <code>${escapeHtml(monitorUrl)}</code></p>
    </section>

    <section class="section split">
      <div>
        <h2>Viktigste funn</h2>
        <table><thead><tr><th>Kø</th><th class="num">Antall</th><th>Type</th></tr></thead><tbody>${tableRows(summary.topQueues)}</tbody></table>
      </div>
      <div>
        <h2>Anbefalt oppfølging</h2>
        <div class="callout"><p><strong>Ikke fiks direkte fra monitor.</strong> Start med å sjekke konsument/jobber og siste feil på de største køene. Poison-køer bør undersøkes før replay eller rydding vurderes.</p></div>
        <p><strong>1. Store backlog-køer:</strong> kontroller at konsumenten kjører, og om antallet går ned ved ny refresh.</p>
        <p><strong>2. Pick and Collect:</strong> sjekk PnC external export og endepunkt mot nettbutikk/preprod.</p>
        <p><strong>3. Poison:</strong> åpne én representativ melding read-only og noter exception/payload før tiltak.</p>
      </div>
    </section>

    <section class="section">
      <h2>Tolkning per toppkø</h2>
      <table><thead><tr><th>Kø</th><th>Hva den sannsynligvis gjør</th><th>Hva som bør sjekkes</th></tr></thead><tbody>${interpretationRows(summary.topQueues)}</tbody></table>
    </section>

    <section class="section">
      <h2>Skjermbilde</h2>
      <p class="note">Filter satt til Journal + Poison + Empty for å vise alle køer.</p>
      ${screenshotHref ? `<img src="${escapeHtml(screenshotHref)}" alt="HC-018 Message Queue skjermbilde" />` : '<p class="note">Skjermbilde ble ikke lagret.</p>'}
    </section>

    <section class="section">
      <details>
        <summary>Vis hele kølisten (${summary.queueCount} linjer)</summary>
        <table><thead><tr><th>Kø</th><th class="num">Antall</th><th>Type</th></tr></thead><tbody>${tableRows(queues)}</tbody></table>
      </details>
    </section>
  </main>
</body>
</html>`;
}

function writeMonitorQueueReport({ queues, screenshotPath, monitorUrl, runId, confluenceStatus }) {
  const reportDir = path.resolve('test-artifacts/reports/agent-diagnoses');
  const evidenceDir = path.resolve('test-artifacts/evidence');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const timestamp = runId || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const reportPath = path.join(reportDir, `HC-018-${timestamp}-message-queue-report.html`);
  const jsonPath = path.join(evidenceDir, `HC-018-${timestamp}-message-queue.json`);
  const summary = summarizeQueues(queues);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        testId: 'HC-018',
        runId: timestamp,
        monitorUrl,
        screenshot: screenshotPath ? relPath(screenshotPath) : '',
        summary,
        queues,
      },
      null,
      2,
    ),
    'utf8',
  );
  fs.writeFileSync(
    reportPath,
    formatMonitorQueueReport({ queues, screenshotPath, monitorUrl, confluenceStatus }),
    'utf8',
  );

  return {
    reportPath,
    jsonPath,
    relativeReportPath: relPath(reportPath),
    relativeJsonPath: relPath(jsonPath),
    summary,
  };
}

module.exports = {
  MONITOR_QUEUE_URL,
  classifyQueue,
  extractQueuePairsFromText,
  formatMonitorQueueReport,
  summarizeQueues,
  writeMonitorQueueReport,
};
