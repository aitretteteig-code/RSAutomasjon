const path = require('path');
const base = require('@playwright/test');
const { buildCheckDiagnosis, createBrowserTestAgent, hasDiagnosisForTest } = require('./browser-test-agent');
const { installPauseControl } = require('./pause-control');

const evidenceDir = path.resolve('test-artifacts/evidence');

function extractTestId(testInfo) {
  const titlePath = typeof testInfo.titlePath === 'function' ? testInfo.titlePath().join(' ') : testInfo.title;
  const source = `${path.basename(testInfo.file || '')} ${titlePath}`;
  const match = source.replace(/_/g, '-').match(/\b([A-Z]+)-?(\d{1,3})\b/i);
  if (!match) return 'ADHOC';
  return `${match[1].toUpperCase()}-${match[2].padStart(3, '0')}`;
}

function runIdFor(testId, testInfo) {
  const envKey = `${testId.replace(/-/g, '')}_RUN_ID`;
  if (process.env[envKey]) return process.env[envKey];
  if (process.env.BROWSER_TEST_AGENT_RUN_ID) return process.env.BROWSER_TEST_AGENT_RUN_ID;
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `${timestamp}-${testInfo.workerIndex || 0}-${testInfo.retry || 0}`;
}

function errorMessage(error) {
  if (!error) return 'Testen feilet uten registrert Playwright-feilmelding.';
  return String(error.message || error).replace(/\s+/g, ' ').trim().slice(0, 700);
}

const test = base.test.extend({
  browserAgent: [
    async ({ page }, use, testInfo) => {
      const testId = extractTestId(testInfo);
      const runId = runIdFor(testId, testInfo);
      if (process.env.PW_ENABLE_PORTAL_PAUSE !== '0') {
        const pauseTimeout = Number(process.env.PW_PAUSE_TEST_TIMEOUT_MS || 24 * 60 * 60 * 1000);
        testInfo.setTimeout(Math.max(testInfo.timeout, pauseTimeout));
      }
      installPauseControl(page, { runId: process.env.BROWSER_TEST_RUN_ID || runId, testId });
      const browserAgent = createBrowserTestAgent({ page, testId, runId, evidenceDir });

      await use(browserAgent);

      if (hasDiagnosisForTest(testId, runId)) {
        return;
      }

      const titlePath = typeof testInfo.titlePath === 'function' ? testInfo.titlePath().join(' > ') : testInfo.title;
      const passed = testInfo.status === testInfo.expectedStatus;
      const failureText = passed ? '' : errorMessage(testInfo.error);
      const baseDiagnosis = buildCheckDiagnosis({
        testId,
        checks: { testRun: passed },
        checkInfo: {
          testRun: {
            title: 'Testkjøring fullført',
            fail: failureText,
          },
        },
        browserFindings: browserAgent.findings(),
        context: {
          file: path.relative(process.cwd(), testInfo.file || '').split(path.sep).join('/'),
          project: testInfo.project.name,
          retry: testInfo.retry,
          status: testInfo.status,
          expectedStatus: testInfo.expectedStatus,
        },
        nextAction: passed
          ? 'Ingen oppfølging nødvendig. Bruk rapporten som dokumentasjon på at testen passerte.'
          : 'Les agentrapporten, vurder om feilen skyldes innlogging, butikkvalg, timing, miljø eller en reell testassert.',
      });

      await browserAgent
        .diagnose({
          step: titlePath,
          expected: 'Testen skulle kjøre ferdig uten Playwright-feil.',
          error: passed ? null : testInfo.error || new Error(failureText),
          baseDiagnosis,
          extra: {
            durationMs: testInfo.duration,
            retry: testInfo.retry,
            title: testInfo.title,
          },
        })
        .catch((diagnosisError) => {
          console.log(`${testId}-DIAGNOSIS-ERROR ${diagnosisError.message}`);
        });
    },
    { auto: true },
  ],
});

module.exports = {
  ...base,
  test,
  expect: base.expect,
};
