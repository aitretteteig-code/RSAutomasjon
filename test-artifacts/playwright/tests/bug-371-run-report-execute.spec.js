const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-run-report-execute.json`);
const batchId = process.env.BUG371_BATCH_ID || '16925';
const reportId = process.env.BUG371_REPORT_ID || '371';
const reportPath = process.env.BUG371_REPORT_PATH || '~2Fpublic~2FRBI_Content~2FReports~2F0371_BatchTraceability';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 30000) };
}

test(`execute trace report ${reportId} and inspect rendered output`, async ({ page, context }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const responses = [];
  context.on('response', async (response) => {
    const url = response.url();
    if (!/jasperserver|reportsExecutions|exports|pages|0371|0372|BatchTraceability|ProductionTraceability|report/i.test(url)) return;
    const item = { url, status: response.status(), contentType: response.headers()['content-type'] || '' };
    try {
      if (/json|text|html|xml/.test(item.contentType)) {
        item.text = (await response.text()).slice(0, 40000);
      }
    } catch (error) {
      item.error = String(error && error.message ? error.message : error);
    }
    responses.push(item);
  });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`/retailsuite/store/#/report/list/details/${reportId}/${reportPath}/${batchId}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  const before = await capture(page, `execute-report-371-before-${batchId}`);

  const execute = page.getByRole('button', { name: /^Utfør$/ }).first();
  await expect(execute).toBeVisible({ timeout: 15000 });
  await execute.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(15000);
  const after = await capture(page, `execute-report-371-after-${batchId}`);

  const finalText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const responseText = responses.map((item) => `${item.url}\n${item.text || ''}`).join('\n');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    reportId,
    reportPath,
    batchId,
    finalUrl: page.url(),
    hasDefrostedDate: /Opptint|Defrost/i.test(finalText + responseText),
    hasHeatedDate: /Varmebehandlet|Heated/i.test(finalText + responseText),
    hasIngredientLot: /37107100011/.test(finalText + responseText),
    hasReportContentSignal: /BROKKOLISALAT|37107100011|Sporbarhet|BatchTraceability|762777/i.test(finalText + responseText),
    finalText: finalText.replace(/\s+/g, ' ').trim().slice(0, 30000),
    responses,
    captures: [before, after]
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-RUN-REPORT-EXECUTE ${JSON.stringify(result, null, 2)}`);

  expect(result.hasReportContentSignal || responses.some((item) => /reportsExecutions|exports|pages/i.test(item.url))).toBeTruthy();
});
