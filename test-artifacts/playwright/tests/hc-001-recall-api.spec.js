const { test } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

test.describe('HC-001 article recall API', () => {
  test('inspect recall service and API response', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const data = await page.evaluate(async () => {
      const injector = window.angular.element(document.body).injector();
      const service = injector.get('rsArticleRecallService');
      const methodNames = Object.keys(service).sort();

      const apiResponse = await fetch('/RS.WebClient.Api/api/articlerecalls', {
        credentials: 'include'
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }));

      const serviceResults = {};
      for (const method of methodNames) {
        if (method.startsWith('$')) continue;
        if (typeof service[method] !== 'function') continue;
        try {
          const value = service[method]();
          serviceResults[method] = value && value.$promise
            ? await value.$promise
            : value;
        } catch (error) {
          serviceResults[method] = { error: error.message };
        }
      }

      return { methodNames, apiResponse, serviceResults };
    });

    console.log(`HC-001-RECALL-API ${JSON.stringify(data, null, 2)}`);
  });
});
