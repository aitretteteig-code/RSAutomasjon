const { test } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const articleIds = (process.env.HC001_ARTICLE_IDS || '966897,626669,566071')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

test.describe('HC-001 filtered article recalls', () => {
  test('filter recall data for selected articles and recent recalls', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const data = await page.evaluate(async (ids) => {
      const injector = window.angular.element(document.body).injector();
      const service = injector.get('rsArticleRecallService');

      const recalledArticles = await service.getRecalledArticles().$promise;
      const recalls = await service.getRecalls().$promise;

      const selectedArticleMatches = recalledArticles.filter((item) =>
        ids.includes(String(item.articleId || '')) || ids.includes(String(item.barcode || ''))
      );

      const recentRecalls = recalls
        .filter((recall) => String(recall.createdOn || '').startsWith('2026-05-07'))
        .map((recall) => ({
          recallId: recall.recallId,
          title: recall.title,
          status: recall.status,
          createdOn: recall.createdOn,
          modifiedOn: recall.modifiedOn,
          isConfirmed: recall.storeInfo && recall.storeInfo.isConfirmed,
          isRepealed: recall.storeInfo && recall.storeInfo.isRepealed
        }));

      const newestRecalls = recalls
        .slice()
        .sort((a, b) => String(b.createdOn || '').localeCompare(String(a.createdOn || '')))
        .slice(0, 10)
        .map((recall) => ({
          recallId: recall.recallId,
          title: recall.title,
          status: recall.status,
          createdOn: recall.createdOn,
          modifiedOn: recall.modifiedOn,
          isConfirmed: recall.storeInfo && recall.storeInfo.isConfirmed,
          isRepealed: recall.storeInfo && recall.storeInfo.isRepealed
        }));

      return {
        selectedArticleIds: ids,
        selectedArticleMatchCount: selectedArticleMatches.length,
        selectedArticleMatches,
        recentRecalls,
        newestRecalls
      };
    }, articleIds);

    console.log(`HC-001-RECALL-FILTER ${JSON.stringify(data, null, 2)}`);
  });
});
