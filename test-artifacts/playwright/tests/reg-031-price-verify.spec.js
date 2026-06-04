const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const articleId = process.env.RS_PRICE_ARTICLE_ID || '966897';

test.describe('REG-031 price verification', () => {
  test('les gjeldende salgspris uten endring', async ({ page }, testInfo) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const article = await page.evaluate(async (selectedArticleId) => {
      const injector = window.angular.element(document.body).injector();
      const service = injector.get('rsStoreArticleService');
      const querySvc = injector.get('rsArticleSearchQueryService');
      const payload = {
        skip: 0,
        take: 10,
        orderBy: 'articleName',
        excludeRestrictedArticles: false,
        extendedParameters: {
          queryString: selectedArticleId,
          status: querySvc.getDefaultArticleSearchStatuses()
        }
      };
      const result = await service.extendedSearch(payload).$promise;
      return (result.result || []).find((item) => item.articleId === selectedArticleId) || null;
    }, articleId);

    expect(article, `Article ${articleId} should be found`).toBeTruthy();
    console.log(`REG-031-CURRENT-PRICE ${JSON.stringify({
      articleId: article.articleId,
      articleName: article.articleName,
      salesPrice: article.salesPrice
    })}`);
    if (process.env.RS_PRICE_VERIFY_SCREENSHOT) {
      await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.getByRole('heading', { name: 'Fullstendige varedetaljer' })).toBeVisible();
      await expect(page.getByText(articleId).first()).toBeVisible();
      await page.screenshot({ path: process.env.RS_PRICE_VERIFY_SCREENSHOT, fullPage: false });
    }
    await testInfo.attach('reg-031-current-price', {
      body: JSON.stringify({
        articleId: article.articleId,
        articleName: article.articleName,
        salesPrice: article.salesPrice
      }, null, 2),
      contentType: 'application/json'
    });
  });
});
