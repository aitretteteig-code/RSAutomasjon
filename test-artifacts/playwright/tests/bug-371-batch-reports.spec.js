const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-batch-reports.json`);

test('inspect batch reports for report 371', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  await page.goto('/retailsuite/store/#/batches/batch/list/reports', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-batch-reports.png`), fullPage: false });

  const result = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalize(document.body.innerText).slice(0, 10000),
      controls: [...document.querySelectorAll('button,a,input,select,textarea,[ng-click]')]
        .filter(visible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: normalize(el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          href: el.getAttribute('href'),
          ngClick: el.getAttribute('ng-click'),
          ngModel: el.getAttribute('ng-model')
        }))
        .slice(0, 260)
    };
  });

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-BATCH-REPORTS ${JSON.stringify(result, null, 2)}`);

  expect(result.bodyText).toMatch(/Batch|Rapport|371|Sporbarhet|Trace/i);
});
