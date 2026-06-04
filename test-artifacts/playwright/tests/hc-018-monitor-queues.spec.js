const { test, expect } = require('../helpers/agent-test');
const { buildCheckDiagnosis } = require('../helpers/browser-test-agent');
const { createHybridContext, normalize } = require('../helpers/hybrid-flow');
const {
  MONITOR_QUEUE_URL,
  extractQueuePairsFromText,
  writeMonitorQueueReport,
} = require('../helpers/monitor-queue-report');

test.describe('HC-018 Gjennomgang av koer pa monitor', () => {
  test('registrer monitor-gjennomgang av koer', async ({ page, browserAgent }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-018', 'HC-018');

    await page.goto(MONITOR_QUEUE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await ctx.manualStep({
      key: 'monitor-login',
      title: 'Logg inn i RS Monitor',
      message: 'Logg inn i browseren med din egen bruker. Trykk Gjennomfort nar du er inne i RS Monitor.',
      details: [
        `Testen har apnet ${MONITOR_QUEUE_URL}.`,
        'Hvis du ser innloggingssiden, logg inn manuelt.',
        'Hvis du allerede er innlogget, trykk Gjennomfort sa fort siden viser dashboards eller Message Queue.',
        'Testen gjor kun read-only handlinger etter dette: filter, screenshot og rapport.',
      ],
      timeoutMs: 24 * 60 * 60 * 1000,
    });

    await page.goto(MONITOR_QUEUE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    const monitorVisible = /Message Queue/i.test(
      normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => '')),
    );

    await page.locator('input[ng-model="queueIncludeJournal"]').setChecked(true).catch(() => {});
    await page.locator('input[ng-model="queueIncludePoison"]').setChecked(true).catch(() => {});
    await page.locator('input[ng-model="queueIncludeEmpty"]').setChecked(true).catch(() => {});
    await page.locator('button[ng-click="filterQueue()"]').click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    const screenshotPath = ctx.screenshotPath('message-queue-all-filters');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    const bodyText = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
    const queues = extractQueuePairsFromText(bodyText);
    const queueReport = writeMonitorQueueReport({
      queues,
      screenshotPath,
      monitorUrl: page.url(),
      runId: ctx.runId,
      confluenceStatus:
        'Confluence-oppslag kjøres ikke inne i Playwright-portalen ennå. Rapporten bruker lokal diagnose basert på kønavn og monitorverdier.',
    });
    console.log(`HC-018-QUEUE-REPORT ${queueReport.relativeReportPath}`);
    console.log(`HC-018-QUEUE-DATA ${queueReport.relativeJsonPath}`);

    const checks = {
      monitorOpened: monitorVisible && /\/vri\/vri\/mq/i.test(page.url()),
      queueListCaptured: queues.length > 0,
      queueReportWritten: Boolean(queueReport.relativeReportPath),
      readOnly: true,
    };

    const queueSummary = queueReport.summary;
    const baseDiagnosis = buildCheckDiagnosis({
      testId: 'HC-018',
      checks,
      checkInfo: {
        monitorOpened: {
          title: 'RS Monitor Message Queue åpnet',
          fail: 'Testen kom ikke sikkert inn på VRI / Message Queue etter manuell innlogging.',
        },
        queueListCaptured: {
          title: 'Kølisten ble lest',
          fail: 'Testen fant ingen kølinjer etter at Journal, Poison og Empty var aktivert.',
        },
        queueReportWritten: {
          title: 'HTML-rapport ble laget',
          fail: 'Kørapporten ble ikke skrevet til test-artifacts/reports/agent-diagnoses.',
        },
        readOnly: {
          title: 'Kun read-only handlinger brukt',
          fail: 'Testen skulle ikke gjøre endringer i monitoren.',
        },
      },
      browserFindings: browserAgent.findings(),
      context: {
        queueReport: queueReport.relativeReportPath,
        queueData: queueReport.relativeJsonPath,
        screenshot: `test-artifacts/evidence/HC-018-${ctx.runId}-message-queue-all-filters.png`,
        extraCheck: `${queueSummary.queueCount} kølinjer lest. ${queueSummary.nonZeroCount} køer hadde meldinger, totalt ${queueSummary.totalMessages}. ${queueSummary.poisonCount} poison-køer hadde meldinger.`,
        relatedArtifacts: [
          {
            label: 'HC-018 Message Queue rapport',
            path: queueReport.relativeReportPath,
          },
          {
            label: 'Kødata JSON',
            path: queueReport.relativeJsonPath,
          },
        ],
      },
      nextAction: queueSummary.nonZeroCount
        ? 'Se HC-018 Message Queue rapporten. Følg opp store backlog-køer og poison-køer read-only før eventuelle tiltak vurderes.'
        : 'Ingen køer med meldinger ble observert. Bruk rapporten som dokumentasjon.',
    });

    const diagnosis = await browserAgent.diagnose({
      step: 'HC-018 Message Queue read-only diagnose',
      expected: 'RS Monitor åpnes, alle køfiltre vises, kølisten leses og rapport genereres uten å endre noe.',
      baseDiagnosis,
      extra: {
        queueSummary,
        topQueues: queueSummary.topQueues,
        queueReport: queueReport.relativeReportPath,
      },
    });

    const result = ctx.writeResult({
      result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
      checks: {
        ...checks,
        hasMessages: queueSummary.nonZeroCount > 0,
        hasPoisonMessages: queueSummary.poisonCount > 0,
      },
      queueSummary,
      report: queueReport.relativeReportPath,
      queueData: queueReport.relativeJsonPath,
      diagnosis,
    });

    expect(result.checks.monitorOpened, diagnosis.summary).toBeTruthy();
    expect(result.checks.queueListCaptured, diagnosis.summary).toBeTruthy();
    expect(result.checks.queueReportWritten, diagnosis.summary).toBeTruthy();
  });
});
