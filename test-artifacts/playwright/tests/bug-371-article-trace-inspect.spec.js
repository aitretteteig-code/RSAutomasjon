const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-article-trace-inspect.json`);
const articleId = process.env.BUG371_ARTICLE_ID || '514687';
const lotNumber = process.env.BUG371_LOT_NUMBER || '2026050701';

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
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
      bodyText: normalizeLocal(document.body.innerText).slice(0, 15000),
      controls: [...document.querySelectorAll('button,a,input,select,[ng-click]')]
        .filter(visible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: normalizeLocal(el.innerText || el.value || el.getAttribute('title') || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          title: el.getAttribute('title'),
          placeholder: el.getAttribute('placeholder'),
          href: el.getAttribute('href'),
          ngClick: el.getAttribute('ng-click'),
          ngModel: el.getAttribute('ng-model')
        }))
        .slice(0, 320)
    };
  });
  return { name, screenshot, ...data };
}

test('inspect article and batch trace entry points for report 371', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const captures = [];

  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, { waitUntil: 'domcontentloaded' });
  captures.push(await capture(page, `article-${articleId}`));

  const clickedArticleTraceCandidate = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('button,a,input[type="button"],[ng-click]')];
    const target = controls.find((el) => /sporing|sporbar|batch/i.test(el.innerText || el.value || el.getAttribute('title') || ''));
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  });
  if (clickedArticleTraceCandidate) {
    captures.push(await capture(page, `article-${articleId}-trace-click`));
  }

  await page.goto('/retailsuite/store/#/batches/batch/list/search', { waitUntil: 'domcontentloaded' });
  captures.push(await capture(page, 'batch-search-initial'));

  const lotInput = page.locator('input[name="batch"]:visible').first();
  if (await lotInput.isVisible().catch(() => false)) {
    await lotInput.fill(lotNumber);
    await page.waitForTimeout(2500);
    captures.push(await capture(page, `batch-search-lot-${lotNumber}`));
  }

  const articleInput = page.locator('input[name="article"]:visible').first();
  if (await articleInput.isVisible().catch(() => false)) {
    await articleInput.fill(articleId);
    await page.waitForTimeout(2500);
    captures.push(await capture(page, `batch-search-article-${articleId}`));
  }

  const clickedBatchTraceCandidate = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('button,a,input[type="button"],[ng-click]')];
    const target = controls.find((el) => /vis sporing|sporing|sporbar|detaljer/i.test(el.innerText || el.value || el.getAttribute('title') || ''));
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  });
  if (clickedBatchTraceCandidate) {
    captures.push(await capture(page, `batch-trace-click-${lotNumber}`));
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    articleId,
    lotNumber,
    clickedArticleTraceCandidate,
    clickedBatchTraceCandidate,
    captures
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-ARTICLE-TRACE ${JSON.stringify(result, null, 2)}`);

  expect(captures.map((item) => item.bodyText).join(' ')).toMatch(/sporing|sporbar|Batch|LOT|371/i);
});
