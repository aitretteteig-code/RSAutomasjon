const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-production-pick-batch-inspect.json`);
const productionArticleId = process.env.BUG371_PRODUCTION_ARTICLE_ID || '514687';
const ingredientLot = process.env.BUG371_LOT_NUMBER || '37107100011';

async function openArticleWithLatestDeclaration(page, articleId) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[ng-click="selectContentDeclaration(item)"]')];
    const row = rows[rows.length - 1];
    if (row) {
      row.scrollIntoView({ block: 'center' });
      row.click();
    }
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
}

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const data = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalize(document.body.innerText).slice(0, 15000),
      inputs: [...document.querySelectorAll('input,select,textarea')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          ngModel: el.getAttribute('ng-model')
        })),
      controls: [...document.querySelectorAll('button,a,input[type="button"],[ng-click]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText || el.value || el.getAttribute('title')),
          ngClick: el.getAttribute('ng-click'),
          href: el.getAttribute('href')
        }))
        .filter((item) => item.text || item.ngClick || item.href)
        .slice(0, 260)
    };
  });
  return { name, screenshot, ...data };
}

test('create production and inspect picking existing ingredient batch', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const captures = [];
  await openArticleWithLatestDeclaration(page, productionArticleId);
  await page.getByText('Start ny produksjon').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);

  const productionUrl = page.url();
  const productionId = (productionUrl.match(/details\/(\d+)/) || [])[1] || 'unknown';
  captures.push(await capture(page, `production-created-${productionId}`));

  await page.evaluate(() => {
    const link = document.querySelector('a[ng-click="setPage(2)"]');
    if (link) link.click();
  });
  captures.push(await capture(page, `pick-tab-${productionId}`));

  await page.evaluate(() => {
    const detail = [...document.querySelectorAll('button,a,input[type="button"]')]
      .find((el) => /Detaljer/i.test(el.innerText || el.value || el.getAttribute('title') || ''));
    if (detail) detail.click();
  });
  await page.waitForTimeout(1600);
  captures.push(await capture(page, `pick-detail-modal-${productionId}`));

  const lotFilled = await page.locator('.modal-content input').filter({ hasText: ingredientLot }).count().catch(() => 0);
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    productionArticleId,
    ingredientLot,
    productionId,
    productionUrl,
    lotFilled,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-PRODUCTION-PICK-BATCH-INSPECT ${JSON.stringify(result, null, 2)}`);

  expect(productionId).not.toBe('unknown');
});
