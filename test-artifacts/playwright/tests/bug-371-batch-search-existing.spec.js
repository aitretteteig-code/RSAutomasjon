const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-batch-search-existing.json`);
const articleId = process.env.BUG371_ARTICLE_ID || '514687';

test('search existing batches for production article', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto('/retailsuite/store/#/batches/batch/list/search', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const articleInput = page.locator('input[name="article"]:visible').first();
  await expect(articleInput).toBeVisible();
  await articleInput.fill(articleId);
  await page.waitForTimeout(2000);

  const option = page.getByText(articleId).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-batch-search-${articleId}.png`), fullPage: false });

  const result = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalize(document.body.innerText).slice(0, 12000),
      rows: [...document.querySelectorAll('.rs-table-row, tbody tr, [ng-repeat*="batch"]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText),
          ngClick: el.getAttribute('ng-click')
        }))
        .filter((item) => item.text)
        .slice(0, 80),
      controls: [...document.querySelectorAll('button,a,input,[ng-click]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          ngClick: el.getAttribute('ng-click'),
          ngModel: el.getAttribute('ng-model')
        }))
        .slice(0, 180)
    };
  });

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, articleId, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-BATCH-SEARCH-EXISTING ${JSON.stringify(result, null, 2)}`);

  expect(result.bodyText).toContain('Batcher');
});
