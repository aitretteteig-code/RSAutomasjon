const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-created-batch-with-dates.json`);
const articleId = process.env.BUG371_INGREDIENT_ARTICLE_ID || '762777';
const lotNumber = process.env.BUG371_LOT_NUMBER || `371${runId.slice(-8)}`;
const dateValue = process.env.BUG371_DATE || '07.05.2026';

test('create ingredient batch with explicit defrosted and heated dates', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const target = [...document.querySelectorAll('[ng-click="openCreateBatch()"]')].find((el) => /Ny batch/i.test(el.innerText || el.getAttribute('title') || ''));
    if (target) target.click();
  });
  await page.waitForTimeout(1200);

  const modal = page.locator('.modal-content').last();
  await expect(modal).toBeVisible();

  await modal.locator('input[name="lotNumber"]').fill(lotNumber);
  await modal.locator('input[name="defrostedDate"]').fill(dateValue);
  await modal.locator('input[name="heatedDate"]').fill(dateValue);
  await modal.locator('input[name="frozenDate"]').fill(dateValue);
  await modal.locator('input[name="bestBeforeOrExpiryDate"]').fill(dateValue);
  await modal.locator('input[name="heatedDate"]').blur();
  await page.waitForTimeout(700);

  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-created-batch-filled-${lotNumber}.png`), fullPage: false });

  await modal.getByRole('button', { name: /^Lagre$/ }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-created-batch-after-save-${lotNumber}.png`), fullPage: false });

  await page.goto('/retailsuite/store/#/batches/batch/list/search', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('input[name="batch"]:visible').first().fill(lotNumber);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-created-batch-search-${lotNumber}.png`), fullPage: false });

  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    articleId,
    lotNumber,
    dateValue,
    bodyTextAfterSearch: bodyText.replace(/\s+/g, ' ').trim().slice(0, 8000),
    foundInBatchSearch: bodyText.includes(lotNumber)
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-CREATED-BATCH-WITH-DATES ${JSON.stringify(result, null, 2)}`);

  expect(result.foundInBatchSearch).toBeTruthy();
});
