const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-new-batch-locators.json`);
const articleId = process.env.BUG371_INGREDIENT_ARTICLE_ID || '762777';

test('inspect Playwright locators inside new batch modal', async ({ page }) => {
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

  const locators = [];
  const inputCount = await modal.locator('input').count();
  for (let index = 0; index < inputCount; index += 1) {
    const input = modal.locator('input').nth(index);
    locators.push({
      index,
      visible: await input.isVisible().catch(() => false),
      value: await input.inputValue().catch(() => null),
      placeholder: await input.getAttribute('placeholder').catch(() => null),
      type: await input.getAttribute('type').catch(() => null),
      name: await input.getAttribute('name').catch(() => null),
      ngModel: await input.getAttribute('ng-model').catch(() => null),
      outer: await input.evaluate((el) => el.outerHTML).catch((error) => String(error.message || error))
    });
  }

  const selectCount = await modal.locator('select').count();
  const selects = [];
  for (let index = 0; index < selectCount; index += 1) {
    const select = modal.locator('select').nth(index);
    selects.push({
      index,
      visible: await select.isVisible().catch(() => false),
      value: await select.inputValue().catch(() => null),
      name: await select.getAttribute('name').catch(() => null),
      ngModel: await select.getAttribute('ng-model').catch(() => null),
      outer: await select.evaluate((el) => el.outerHTML).catch((error) => String(error.message || error))
    });
  }

  const buttons = [];
  const buttonCount = await modal.locator('button,input[type="button"],input[type="submit"]').count();
  for (let index = 0; index < buttonCount; index += 1) {
    const button = modal.locator('button,input[type="button"],input[type="submit"]').nth(index);
    buttons.push({
      index,
      visible: await button.isVisible().catch(() => false),
      text: (await button.innerText().catch(() => null)) || (await button.inputValue().catch(() => null)),
      type: await button.getAttribute('type').catch(() => null),
      ngClick: await button.getAttribute('ng-click').catch(() => null),
      disabled: await button.isDisabled().catch(() => null)
    });
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    articleId,
    modalText: await modal.innerText().catch(() => ''),
    locators,
    selects,
    buttons
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-NEW-BATCH-LOCATORS ${JSON.stringify(result, null, 2)}`);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-new-batch-locators.png`), fullPage: false });

  expect(inputCount).toBeGreaterThan(0);
});
