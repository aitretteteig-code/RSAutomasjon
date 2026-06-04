const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-finish-and-trace.json`);
const productionId = process.env.BUG371_PRODUCTION_ID || '19605';
const productionArticleId = process.env.BUG371_PRODUCTION_ARTICLE_ID || '514687';
const finishedLot = process.env.BUG371_FINISHED_LOT || '2026050702';

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1300);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { name, screenshot, url: page.url(), bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 16000) };
}

test('finish production and inspect trace/report 371 entry point', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  const captures = [];

  await page.goto(`/retailsuite/store/#/batches/production/details/${productionId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.locator('a[ng-click="setPage(3)"]').click({ force: true });
  captures.push(await capture(page, `finish-production-before-${productionId}`));

  const finishVisible = await page.getByRole('button', { name: /^Fullfør$/ }).first().isVisible().catch(() => false);
  if (finishVisible) {
    await page.getByRole('button', { name: /^Fullfør$/ }).first().click();
    await page.waitForTimeout(1000);
    const ok = page.getByRole('button', { name: /^OK$/ }).first();
    if (await ok.isVisible().catch(() => false)) {
      await ok.click();
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
  }
  captures.push(await capture(page, `finish-production-after-${productionId}`));

  await page.goto('/retailsuite/store/#/batches/batch/list/search', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('input[name="batch"]:visible').first().fill(finishedLot);
  await page.waitForTimeout(1800);
  await page.locator('input[name="article"]:visible').first().fill(productionArticleId);
  await page.waitForTimeout(2500);
  captures.push(await capture(page, `finished-batch-search-${finishedLot}`));

  const traceClick = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const controls = [...document.querySelectorAll('button,a,input[type="button"],[ng-click]')];
    const candidates = controls.map((el, index) => ({
      index,
      text: normalize(el.innerText || el.value || el.getAttribute('title')),
      ngClick: el.getAttribute('ng-click'),
      href: el.getAttribute('href')
    }));
    const target = controls.find((el) => /Vis sporing|Sporing|Trace|Detaljer|Handlinger/i.test(normalize(el.innerText || el.value || el.getAttribute('title'))));
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.click();
      return { clicked: true, candidates };
    }
    return { clicked: false, candidates };
  });
  if (traceClick.clicked) {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    captures.push(await capture(page, `trace-click-${finishedLot}`));
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    productionId,
    productionArticleId,
    finishedLot,
    finishVisible,
    traceClick,
    finalUrl: page.url(),
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-FINISH-AND-TRACE ${JSON.stringify(result, null, 2)}`);

  expect(captures.length).toBeGreaterThan(2);
});
