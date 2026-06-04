const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const articleIds = (process.env.RS_ARTICLE_IDS || '966897')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

test.describe('RS article lookup', () => {
  test('les artikkeldata for testforberedelse', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const articles = await page.evaluate(async (ids) => {
      const injector = window.angular.element(document.body).injector();
      const service = injector.get('rsStoreArticleService');
      const querySvc = injector.get('rsArticleSearchQueryService');

      const results = [];
      for (const id of ids) {
        const payload = {
          skip: 0,
          take: 10,
          orderBy: 'articleName',
          excludeRestrictedArticles: false,
          extendedParameters: {
            queryString: id,
            status: querySvc.getDefaultArticleSearchStatuses()
          }
        };
        const result = await service.extendedSearch(payload).$promise;
        const article = (result.result || []).find((item) => item.articleId === id);
        results.push(article || { articleId: id, missing: true });
      }
      return results;
    }, articleIds);

    expect(articles.every((article) => !article.missing)).toBeTruthy();
    console.log(`RS-ARTICLE-LOOKUP ${JSON.stringify(articles, null, 2)}`);
  });
});
