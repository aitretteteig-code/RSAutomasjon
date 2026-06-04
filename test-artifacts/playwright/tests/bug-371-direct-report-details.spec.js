const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-direct-report-details.json`);

test('open direct report 371 route and inspect parameters', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const reportPath = '~2Fpublic~2FRBI_Content~2FReports~2F0371_BatchTraceability';
  await page.goto(`/retailsuite/store/#/report/list/details/371/${reportPath}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-direct-report-371.png`), fullPage: false });

  const result = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    return {
      url: location.href,
      bodyText: normalize(document.body.innerText).slice(0, 16000),
      inputs: [...document.querySelectorAll('input,select,textarea')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          ngModel: el.getAttribute('ng-model')
        })),
      buttons: [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[ng-click]')]
        .filter(visible)
        .map((el) => ({
          text: normalize(el.innerText || el.value || el.getAttribute('title')),
          ngClick: el.getAttribute('ng-click'),
          href: el.getAttribute('href')
        }))
        .filter((item) => item.text || item.ngClick || item.href)
        .slice(0, 240)
    };
  });

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-DIRECT-REPORT ${JSON.stringify(result, null, 2)}`);

  expect(result.url).toContain('/report/list/details/371/');
});
