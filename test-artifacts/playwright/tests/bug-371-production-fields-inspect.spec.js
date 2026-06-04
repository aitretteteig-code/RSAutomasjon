const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-production-fields.json`);
const productionId = process.env.BUG371_PRODUCTION_ID || '19604';

async function inspectCurrentPage(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-${name}-${productionId}.png`), fullPage: false });
  return page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalize(document.body.innerText).slice(0, 14000),
      inputs: [...document.querySelectorAll('input,select,textarea')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          ngModel: el.getAttribute('ng-model')
        })),
      controls: [...document.querySelectorAll('button,a,[ng-click]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText || el.getAttribute('title')),
          href: el.getAttribute('href'),
          ngClick: el.getAttribute('ng-click')
        }))
        .filter((item) => item.text || item.href || item.ngClick)
        .slice(0, 220)
    };
  });
}

test('inspect production detail date fields and ingredient batch controls', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, { waitUntil: 'domcontentloaded' });
  const captures = [];
  captures.push({ name: 'details-default', data: await inspectCurrentPage(page, 'details-default') });

  for (const tab of [
    { name: 'pick-ingredients', selector: 'a[ng-click="setPage(2)"]' },
    { name: 'production', selector: 'a[ng-click="setPage(3)"]' }
  ]) {
    await page.evaluate((selector) => {
      const link = document.querySelector(selector);
      if (link) link.click();
    }, tab.selector);
    captures.push({ name: tab.name, data: await inspectCurrentPage(page, tab.name) });
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    productionId,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-PRODUCTION-FIELDS ${JSON.stringify(result, null, 2)}`);

  expect(page.url()).toContain(`/batches/production/details/${productionId}`);
});
