const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

test.describe('RS Store smoke', () => {
  test('login og butikk-kontekst er OK', async ({ page }, testInfo) => {
    await loginIfNeeded(page);
    const context = await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    await expect(page.getByText(process.env.RS_STORE_NAME || DEFAULT_STORE_NAME).first()).toBeVisible();
    await testInfo.attach('store-context', {
      body: JSON.stringify(context, null, 2),
      contentType: 'application/json'
    });

    const screenshot = await page.screenshot({ fullPage: false });
    await testInfo.attach('post-login-store-selected', {
      body: screenshot,
      contentType: 'image/png'
    });
  });
});
