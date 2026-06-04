const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-ingredient-details.json`);
const productionId = process.env.BUG371_PRODUCTION_ID || '19604';

test('inspect picked ingredient detail dialog for date fields', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const link = document.querySelector('a[ng-click="setPage(2)"]');
    if (link) link.click();
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const detail = [...document.querySelectorAll('button,a,input[type="button"]')]
      .find((el) => /Detaljer/i.test(el.innerText || el.value || ''));
    if (detail) detail.click();
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-ingredient-details-${productionId}.png`), fullPage: false });

  const result = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const active = document.querySelector('.modal-content') || document.body;
    return {
      url: location.href,
      bodyText: normalize(active.innerText || document.body.innerText).slice(0, 12000),
      inputs: [...active.querySelectorAll('input,select,textarea')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          ngModel: el.getAttribute('ng-model')
        })),
      controls: [...active.querySelectorAll('button,a,input[type="button"],[ng-click]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText || el.value || el.getAttribute('title')),
          ngClick: el.getAttribute('ng-click')
        }))
        .filter((item) => item.text || item.ngClick)
    };
  });

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, productionId, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-INGREDIENT-DETAILS ${JSON.stringify(result, null, 2)}`);

  expect(result.bodyText).toMatch(/Detaljer|Plukk|Batch|LOT|Utløpsdato|Utlo/i);
});
