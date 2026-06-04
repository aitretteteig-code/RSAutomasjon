const { test } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

test.describe('HC-001 RS Store inspection', () => {
  test('list relevant routes and services', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const data = await page.evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const links = [...document.querySelectorAll('a[href], button, [ng-click]')]
        .map((el) => ({
          tag: el.tagName,
          text: normalize(el.innerText || el.value || el.title || el.getAttribute('aria-label')),
          href: el.getAttribute('href') || '',
          ngClick: el.getAttribute('ng-click') || '',
          title: el.getAttribute('title') || ''
        }))
        .filter((item) => {
          const haystack = `${item.text} ${item.href} ${item.ngClick} ${item.title}`.toLowerCase();
          return haystack.includes('sperr')
            || haystack.includes('recall')
            || haystack.includes('tilbake')
            || haystack.includes('melding')
            || haystack.includes('vare');
        });

      let angularKeys = [];
      let resources = [];
      let moduleInfo = [];
      try {
        const injector = window.angular.element(document.body).injector();
        const candidates = [
          'rsArticleRecallService',
          'rsStoreArticleRecallService',
          'articleRecallService',
          'rsStoreArticleService',
          'rsArticleService',
          'rsStoreRecallService',
          'rsRecallService'
        ];
        angularKeys = candidates.map((name) => {
          try {
            return { name, available: injector.has(name) };
          } catch (error) {
            return { name, available: false, error: error.message };
          }
        });
      } catch (error) {
        angularKeys = [`service-list-error: ${error.message}`];
      }
      try {
        resources = performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => /recall|article|store|app|js/i.test(name))
          .slice(-100);
      } catch (error) {
        resources = [`resource-list-error: ${error.message}`];
      }
      try {
        moduleInfo = [
          window.angular.module('rs-store').requires,
          window.angular.module('rsStore').requires,
          window.angular.module('app').requires
        ];
      } catch (error) {
        moduleInfo = [`module-list-error: ${error.message}`];
      }

      return { links, angularKeys, resources, moduleInfo };
    });

    console.log(`HC-001-RS-INSPECT ${JSON.stringify(data, null, 2)}`);
  });
});
