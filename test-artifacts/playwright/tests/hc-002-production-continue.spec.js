const { test, expect } = require('../helpers/agent-test');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const productionId = process.env.HC002_PRODUCTION_ID || '19604';
const runId = process.env.HC002_RUN_ID || '20260507-101000';
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-002-${runId}-${name}.png`);

test.describe('HC-002 production continuation', () => {
  test('finish existing production and verify declaration', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
    await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText('BROKKOLISALAT M/BACON PR STK')).toBeVisible();

    await page.evaluate(() => {
      const link = document.querySelector('a[ng-click="setPage(2)"]');
      if (link) link.click();
    });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Detaljer' }).first().click();
    await page.waitForTimeout(1000);

    const pickModal = page.locator('.modal-content').filter({ hasText: /Plukk|BROKKOLISALAT/i }).last();
    const pickButton = pickModal.getByRole('button', { name: /Plukk/i }).last();
    await expect(pickButton).toBeVisible();
    await pickButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshot(`after-pick-${productionId}`), fullPage: false });

    const pickedObserved = /Plukkede ingredienser|Ingrediensen ble lagret|BROKKOLISALAT M\/BACON PR KG/i.test(await page.locator('body').innerText());

    await page.evaluate(() => {
      document.querySelectorAll('.modal-content button.close, .modal-dialog button.close').forEach((button) => button.click());
      document.querySelectorAll('.modal-backdrop').forEach((element) => element.remove());
      document.body.classList.remove('modal-open');
      const link = document.querySelector('a[ng-click="setPage(3)"]');
      if (link) link.click();
    });
    await page.waitForTimeout(1000);

    const finish = page.getByRole('button', { name: /Fullfør|Fullfor/i }).first();
    await expect(finish).toBeVisible();
    await finish.click({ force: true });
    await page.waitForTimeout(1000);
    const ok = page.getByRole('button', { name: /^OK$/ }).last();
    if (await ok.isVisible().catch(() => false)) await ok.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshot(`after-finish-${productionId}`), fullPage: false });
    const finishedObserved = /Batchen ble lagret|Fullført|Fullfort|Ferdig/i.test(await page.locator('body').innerText());

    await page.evaluate(() => {
      const link = document.querySelector('a[ng-click="setPage(4)"]');
      if (link) link.click();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: screenshot(`nutrition-${productionId}`), fullPage: false });
    const declarationObserved = /Deklarasjonstekst|Næringsinnhold|Naringsinnhold|Allergener/i.test(await page.locator('body').innerText());

    await page.evaluate(() => {
      const link = document.querySelector('a[ng-click="setPage(5)"]');
      if (link) link.click();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: screenshot(`pricing-${productionId}`), fullPage: false });
    const pricingObserved = /Prissetting|Priskalkulering|Salgspris/i.test(await page.locator('body').innerText());

    const result = { productionId, pickedObserved, finishedObserved, declarationObserved, pricingObserved };
    console.log(`HC-002-PRODUCTION-CONTINUE ${JSON.stringify(result, null, 2)}`);

    expect(pickedObserved).toBeTruthy();
    expect(finishedObserved).toBeTruthy();
    expect(declarationObserved).toBeTruthy();
    expect(pricingObserved).toBeTruthy();
  });
});
