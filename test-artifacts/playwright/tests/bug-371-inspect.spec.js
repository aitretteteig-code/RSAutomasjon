const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-inspect.json`);

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function visibleUiSummary(page) {
  return page.evaluate(() => {
    const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    return {
      url: location.href,
      title: document.title,
      bodyText: normalizeLocal(document.body.innerText).slice(0, 7000),
      controls: [...document.querySelectorAll('button,a,input,select,textarea,[ng-click]')]
        .filter(isVisible)
        .slice(0, 260)
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
    };
  });
}

async function capture(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  const summary = await visibleUiSummary(page);
  const screenshot = path.join(evidenceDir, `BUG-371-${runId}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  return { name, screenshot, ...summary };
}

test('inspect batch, production and report 371 entry points', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const captures = [];

  await page.goto('/retailsuite/store/#/batches/batch/list/search', { waitUntil: 'domcontentloaded' });
  captures.push(await capture(page, 'batch-list'));

  await page.goto('/retailsuite/store/#/batches/production/list/search', { waitUntil: 'domcontentloaded' });
  captures.push(await capture(page, 'production-list'));

  await page.goto('/retailsuite/store/#/report/list', { waitUntil: 'domcontentloaded' });
  captures.push(await capture(page, 'report-list'));

  const reportSearch = page.locator('input[type="search"], input[type="text"]').first();
  if (await reportSearch.isVisible().catch(() => false)) {
    await reportSearch.fill('371');
    await page.waitForTimeout(1200);
    captures.push(await capture(page, 'report-list-search-371'));
  }

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    captures: captures.map((item) => ({
      name: item.name,
      url: item.url,
      screenshot: item.screenshot,
      bodyText: item.bodyText,
      controls: item.controls
    }))
  };

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-INSPECT ${JSON.stringify(result, null, 2)}`);

  expect(captures.length).toBeGreaterThanOrEqual(3);
});
