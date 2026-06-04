const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-run-report-popup.json`);
const batchId = process.env.BUG371_BATCH_ID || '16925';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 24000) };
}

test('run report 371 with batch id parameter and inspect output', async ({ page, context }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const responses = [];
  context.on('response', async (response) => {
    const url = response.url();
    if (!/jasperserver|report|Report|371|0371|BatchTrace|reportsExecutions|exports|pages/i.test(url)) return;
    const item = { url, status: response.status(), contentType: response.headers()['content-type'] || '' };
    try {
      if (/json|text|html|xml/.test(item.contentType)) {
        item.text = (await response.text()).slice(0, 30000);
      }
    } catch (error) {
      item.error = String(error && error.message ? error.message : error);
    }
    responses.push(item);
  });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`/retailsuite/store/#/report/list/details/371/~2Fpublic~2FRBI_Content~2FReports~2F0371_BatchTraceability/${batchId}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(4000);
  const initial = await capture(page, `run-report-371-initial-${batchId}`);

  const showParams = page.getByRole('button', { name: /Vis parametere|Skjul parametere/ }).first();
  if (await showParams.isVisible().catch(() => false)) {
    await showParams.click();
    await page.waitForTimeout(1000);
  }
  const afterParams = await capture(page, `run-report-371-params-${batchId}`);

  const applyClicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button,a,input[type="button"],[ng-click]')];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const target = buttons.find((el) => visible(el) && /apply|run|invokeClick|oppdater|vis rapport/i.test(`${el.innerText || ''} ${el.value || ''} ${el.title || ''} ${el.getAttribute('ng-click') || ''}`));
    if (!target) return false;
    target.click();
    return true;
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(10000);
  const afterApply = await capture(page, `run-report-371-after-apply-${batchId}`);

  const finalText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const responseText = responses.map((item) => `${item.url}\n${item.text || ''}`).join('\n');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    batchId,
    finalUrl: page.url(),
    applyClicked,
    hasDefrostedDate: /Opptint|Defrost/i.test(finalText + responseText),
    hasHeatedDate: /Varmebehandlet|Heated/i.test(finalText + responseText),
    hasIngredientLot: /37107100011/.test(finalText + responseText),
    hasReportContentSignal: /BROKKOLISALAT|37107100011|2026050702|Sporbarhet|BatchTraceability/i.test(finalText + responseText),
    finalText: finalText.replace(/\s+/g, ' ').trim().slice(0, 24000),
    responses,
    captures: [initial, afterParams, afterApply]
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-RUN-REPORT-POPUP ${JSON.stringify(result, null, 2)}`);

  expect(result.hasReportContentSignal || responses.length > 0).toBeTruthy();
});
