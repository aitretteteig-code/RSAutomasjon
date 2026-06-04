const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, DEFAULT_STORE_URL, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-trace-report-popup.json`);
const finishedLot = process.env.BUG371_FINISHED_LOT || '2026050702';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 20000) };
}

test('open report 371 popup from Vis sporing and inspect contents', async ({ page, context }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const responses = [];
  context.on('response', async (response) => {
    const url = response.url();
    if (!/report|Report|371|0371|BatchTrace|Jaspersoft|RBI|batchId/i.test(url)) return;
    const item = { url, status: response.status(), contentType: response.headers()['content-type'] || '' };
    try {
      if (/json|text|html/.test(item.contentType)) {
        item.text = (await response.text()).slice(0, 20000);
      }
    } catch (error) {
      item.error = String(error && error.message ? error.message : error);
    }
    responses.push(item);
  });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`${DEFAULT_STORE_URL}#/batches/batch/list/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await page.locator('input[name="batch"]:visible').first().fill(finishedLot);
  await page.waitForTimeout(2500);
  const listCapture = await capture(page, `popup-trace-list-${finishedLot}`);

  const row = page.locator('.rs-table-row, tbody tr, [ng-click="openBatch(batch)"]').filter({ hasText: finishedLot }).last();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.getByText('Handlinger').last().click({ force: true });
  await page.waitForTimeout(700);
  const menuCapture = await capture(page, `popup-trace-menu-${finishedLot}`);

  const popupPromise = context.waitForEvent('page', { timeout: 15000 });
  await page.getByText('Vis sporing', { exact: true }).last().click({ force: true });
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForLoadState('networkidle').catch(() => {});
  await popup.waitForTimeout(8000);
  const popupCapture = await capture(popup, `popup-report-371-${finishedLot}`);

  const popupText = await popup.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    finishedLot,
    popupUrl: popup.url(),
    has371Url: /371|0371|batchId/i.test(popup.url()),
    hasDefrostedDate: /Opptint|Defrost/i.test(popupText),
    hasHeatedDate: /Varmebehandlet|Heated/i.test(popupText),
    hasIngredientLot: /37107100011/.test(popupText),
    popupText: popupText.replace(/\s+/g, ' ').trim().slice(0, 20000),
    responses,
    captures: [listCapture, menuCapture, popupCapture]
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-TRACE-REPORT-POPUP ${JSON.stringify(result, null, 2)}`);

  expect(result.has371Url).toBeTruthy();
});
