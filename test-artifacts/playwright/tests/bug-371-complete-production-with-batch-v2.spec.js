const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-complete-production-v2.json`);
const productionId = process.env.BUG371_PRODUCTION_ID || '19605';
const ingredientLot = process.env.BUG371_LOT_NUMBER || '37107100011';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 14000) };
}

test('continue production, pick selected dated batch and finish', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  const captures = [];

  await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);

  await page.locator('a[ng-click="setPage(2)"]').click({ force: true });
  await expect(page.getByText('Plukk ingrediensen')).toBeVisible({ timeout: 15000 });
  captures.push(await capture(page, `v2-pick-tab-${productionId}`));

  await page.getByRole('button', { name: /^Detaljer$/ }).first().click();
  await expect(page.locator('.modal-content').last()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
  captures.push(await capture(page, `v2-pick-modal-before-save-${productionId}`));

  const modal = page.locator('.modal-content').last();
  const modalText = await modal.innerText();
  const selectedLotVisible = modalText.includes(ingredientLot);
  if (!selectedLotVisible) {
    const batchSelect = modal.locator('select[name="batches"]');
    if (await batchSelect.isVisible().catch(() => false)) {
      const options = await batchSelect.locator('option').allTextContents();
      const index = options.findIndex((text) => text.includes(ingredientLot));
      if (index >= 0) {
        await batchSelect.selectOption({ index });
      }
    }
  }

  await modal.getByRole('button', { name: /^Plukk$/ }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `v2-after-pick-${productionId}`));

  await page.locator('a[ng-click="setPage(3)"]').click({ force: true });
  await expect(page.getByText('Batch-informasjon')).toBeVisible({ timeout: 15000 });
  captures.push(await capture(page, `v2-production-tab-before-finish-${productionId}`));

  const productionTabText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const finishedBatchLot =
    (productionTabText.match(/LOT-nummer\s+([0-9A-Z-]+)/i) || [])[1] ||
    (productionTabText.match(/LOT-nummer\s*([0-9A-Z-]+)/i) || [])[1] ||
    null;

  const finishButton = page.getByRole('button', { name: /^Fullfør$/ }).first();
  const finishVisible = await finishButton.isVisible().catch(() => false);
  if (finishVisible) {
    await finishButton.click();
    await page.waitForTimeout(1000);
    const okButton = page.getByRole('button', { name: /^OK$/ }).first();
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click();
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500);
  }
  captures.push(await capture(page, `v2-after-finish-${productionId}`));

  const finalText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    productionId,
    ingredientLot,
    selectedLotVisible: selectedLotVisible || finalText.includes(ingredientLot),
    finishedBatchLot,
    finishVisible,
    finalHasSavedText: /Batchen ble lagret|Fullført|Fullfort|lagret/i.test(finalText),
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-COMPLETE-PRODUCTION-V2 ${JSON.stringify(result, null, 2)}`);

  expect(result.selectedLotVisible).toBeTruthy();
});
