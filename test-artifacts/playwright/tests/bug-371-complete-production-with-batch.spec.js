const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-complete-production-with-batch.json`);
const productionId = process.env.BUG371_PRODUCTION_ID || '19605';
const ingredientLot = process.env.BUG371_LOT_NUMBER || '37107100011';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 12000) };
}

test('pick dated ingredient batch and finish production', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  const captures = [];

  await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => {
    const link = document.querySelector('a[ng-click="setPage(2)"]');
    if (link) link.click();
  });
  captures.push(await capture(page, `pick-tab-before-${productionId}`));

  await page.evaluate(() => {
    const detail = [...document.querySelectorAll('button,a,input[type="button"]')]
      .find((el) => /Detaljer/i.test(el.innerText || el.value || el.getAttribute('title') || ''));
    if (detail) detail.click();
  });
  await page.waitForTimeout(1500);
  captures.push(await capture(page, `pick-modal-before-save-${productionId}`));

  const modalText = await page.locator('.modal-content').last().innerText().catch(() => '');
  const selectedLotVisible = modalText.includes(ingredientLot);
  const pickClicked = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const modal = document.querySelector('.modal-content') || document.body;
    const pick = [...modal.querySelectorAll('button,a,input[type="button"],input[type="submit"]')]
      .find((el) => /^Plukk$/i.test(normalize(el.innerText || el.value || el.getAttribute('title'))));
    if (!pick) return false;
    pick.click();
    return true;
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `after-pick-${productionId}`));

  await page.evaluate(() => {
    const link = document.querySelector('a[ng-click="setPage(3)"]');
    if (link) link.click();
  });
  captures.push(await capture(page, `production-tab-before-finish-${productionId}`));

  const productionTabText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const finishedBatchLot = (productionTabText.match(/LOT-nummer\s+([0-9A-Z-]+)/i) || [])[1] || null;

  const finishClicked = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const finish = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"]')]
      .find((el) => /^Fullfør$|^Fullfor$/i.test(normalize(el.innerText || el.value || el.getAttribute('title'))));
    if (!finish) return false;
    finish.click();
    return true;
  });
  await page.waitForTimeout(1000);
  const okClicked = await page.evaluate(() => {
    const ok = [...document.querySelectorAll('button')].find((button) => /^OK$/i.test((button.innerText || '').trim()));
    if (!ok) return false;
    ok.click();
    return true;
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `after-finish-${productionId}`));

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    productionId,
    ingredientLot,
    selectedLotVisible,
    pickClicked,
    finishClicked,
    okClicked,
    finishedBatchLot,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-COMPLETE-PRODUCTION-WITH-BATCH ${JSON.stringify(result, null, 2)}`);

  expect(selectedLotVisible).toBeTruthy();
  expect(pickClicked).toBeTruthy();
});
