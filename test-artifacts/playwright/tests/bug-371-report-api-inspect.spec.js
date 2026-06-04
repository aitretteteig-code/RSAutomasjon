const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-report-api-inspect.json`);

test('inspect report API responses for 371', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const responses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/report|Report|RBI|batch|Batch/.test(url)) return;
    const contentType = response.headers()['content-type'] || '';
    const item = { url, status: response.status(), contentType };
    if (/json|text/.test(contentType)) {
      try {
        const text = await response.text();
        item.text = text.slice(0, 20000);
        item.has371 = text.includes('371') || text.includes('0371');
      } catch (error) {
        item.error = String(error && error.message ? error.message : error);
      }
    }
    responses.push(item);
  });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  await page.goto('/retailsuite/store/#/report/list', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const reportSearch = page.locator('input[placeholder*="ID"]:visible, input[placeholder*="navn"]:visible').first();
  if (await reportSearch.isVisible().catch(() => false)) {
    await reportSearch.fill('371');
    await page.getByRole('button', { name: /^Søk$/ }).first().click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
  }

  await page.goto('/retailsuite/store/#/batches/batch/list/reports', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    responses,
    matches371: responses.filter((item) => item.has371 || /371|0371/.test(item.url))
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-REPORT-API ${JSON.stringify(result, null, 2)}`);

  expect(responses.length).toBeGreaterThan(0);
});
