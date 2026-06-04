const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const screenshotPath = process.env.HC001_RECALL_SCREENSHOT || 'test-artifacts/evidence/screenshots/HC-001-recall-list.png';

test.describe('HC-001 article recall list', () => {
  test('inspect recall list', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    await page.goto('/retailsuite/store/#/articles/articlerecall/list', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText({ timeout: 15000 });
    expect(bodyText).toMatch(/Tilbakekalling|TITTEL|OPPRETTET/i);

    const data = await page.evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const rows = [...document.querySelectorAll('table tbody tr, .k-grid-content tr, [role="row"]')]
        .map((row) => normalize(row.innerText))
        .filter(Boolean);
      const buttons = [...document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')]
        .map((el) => ({
          text: normalize(el.innerText || el.value || el.title || el.getAttribute('aria-label')),
          href: el.getAttribute('href') || '',
          ngClick: el.getAttribute('ng-click') || '',
          title: el.getAttribute('title') || ''
        }))
        .filter((item) => normalize(`${item.text} ${item.href} ${item.ngClick} ${item.title}`));
      return {
        title: document.title,
        bodyText: normalize(document.body.innerText).slice(0, 4000),
        rows,
        buttons
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`HC-001-RECALL-LIST ${JSON.stringify(data, null, 2)}`);
  });
});
