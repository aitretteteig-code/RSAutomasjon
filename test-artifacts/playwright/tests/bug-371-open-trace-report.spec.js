const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, DEFAULT_STORE_URL, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-open-trace-report.json`);
const finishedLot = process.env.BUG371_FINISHED_LOT || '2026050702';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 16000) };
}

test('open Vis sporing for finished batch and capture report 371', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const responses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/report|Report|371|0371|BatchTrace|trace|Trace|Jaspersoft|RBI/i.test(url)) return;
    const item = { url, status: response.status(), contentType: response.headers()['content-type'] || '' };
    try {
      if (/json|text|html/.test(item.contentType)) {
        item.text = (await response.text()).slice(0, 12000);
      }
    } catch (error) {
      item.error = String(error && error.message ? error.message : error);
    }
    responses.push(item);
  });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  const captures = [];

  await page.goto(`${DEFAULT_STORE_URL}#/batches/batch/list/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await page.locator('input[name="batch"]:visible').first().fill(finishedLot);
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `trace-menu-before-${finishedLot}`));

  const row = page.locator('.rs-table-row, tbody tr, [ng-click="openBatch(batch)"]').filter({ hasText: finishedLot }).last();
  await expect(row).toBeVisible({ timeout: 10000 });
  const actionButton = row.getByText('Handlinger').last();
  await actionButton.click({ force: true });
  await page.waitForTimeout(700);
  captures.push(await capture(page, `trace-menu-open-${finishedLot}`));

  const traceMenuItem = page.getByText('Vis sporing', { exact: true }).last();
  await expect(traceMenuItem).toBeVisible({ timeout: 10000 });
  await traceMenuItem.click({ force: true });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  captures.push(await capture(page, `trace-report-after-click-${finishedLot}`));

  const finalText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    finishedLot,
    finalUrl: page.url(),
    hasReport371Signal: /371|0371|Sporing|Trace|Opptint|Varmebehandlet|Laster/.test(finalText) || responses.some((item) => /371|0371/i.test(item.url + JSON.stringify(item))),
    responses,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-OPEN-TRACE-REPORT ${JSON.stringify(result, null, 2)}`);

  expect(result.hasReport371Signal).toBeTruthy();
});
