const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, DEFAULT_STORE_URL, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-finished-batch-trace-inspect.json`);
const finishedLot = process.env.BUG371_FINISHED_LOT || '2026050702';
const productionArticleId = process.env.BUG371_PRODUCTION_ARTICLE_ID || '514687';

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1400);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const data = await page.evaluate(() => {
    const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalizeLocal(document.body.innerText).slice(0, 16000),
      rows: [...document.querySelectorAll('.rs-table-row, tbody tr, [ng-repeat*="batch"], [ng-click*="batch"]')]
        .filter(visible)
        .map((el) => ({
          text: normalizeLocal(el.innerText),
          ngClick: el.getAttribute('ng-click')
        }))
        .filter((item) => item.text)
        .slice(0, 120),
      controls: [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[ng-click]')]
        .filter(visible)
        .map((el, index) => ({
          index,
          text: normalizeLocal(el.innerText || el.value || el.getAttribute('title')),
          title: el.getAttribute('title'),
          ngClick: el.getAttribute('ng-click'),
          href: el.getAttribute('href')
        }))
        .filter((item) => item.text || item.title || item.ngClick || item.href)
        .slice(0, 320)
    };
  });
  return { name, screenshot, ...data };
}

test('find finished batch and inspect trace action', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const captures = [];
  await page.goto(`${DEFAULT_STORE_URL}#/batches/batch/list/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  captures.push(await capture(page, 'fresh-batch-search'));

  const batchInput = page.locator('input[name="batch"]:visible').first();
  await batchInput.fill(finishedLot);
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `fresh-batch-search-lot-${finishedLot}`));

  const articleInput = page.locator('input[name="article"]:visible').first();
  await articleInput.fill(productionArticleId);
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `fresh-batch-search-lot-${finishedLot}-article-${productionArticleId}`));

  const action = await page.evaluate(() => {
    const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const controls = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[ng-click]')];
    const interesting = controls.map((el, index) => ({
      index,
      text: normalizeLocal(el.innerText || el.value || el.getAttribute('title')),
      title: el.getAttribute('title'),
      ngClick: el.getAttribute('ng-click'),
      href: el.getAttribute('href')
    })).filter((item) => /Spor|sporing|Vis|Handlinger|Detaljer|Rapport|batch|trace/i.test(`${item.text} ${item.title} ${item.ngClick} ${item.href}`));
    const target = controls.find((el) => /Vis sporing|sporing|Sporing|Trace|Sporbar/i.test(normalizeLocal(el.innerText || el.value || el.getAttribute('title') || el.getAttribute('ng-click'))));
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.click();
      return { clicked: true, interesting };
    }
    return { clicked: false, interesting };
  });

  if (action.clicked) {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(4000);
    captures.push(await capture(page, `fresh-trace-action-${finishedLot}`));
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    finishedLot,
    productionArticleId,
    action,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-FINISHED-BATCH-TRACE ${JSON.stringify(result, null, 2)}`);

  expect(captures.some((captureItem) => captureItem.bodyText.includes(finishedLot) || captureItem.bodyText.includes('Batcher'))).toBeTruthy();
});
