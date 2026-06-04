const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const articleId = process.env.RS_PRICE_ARTICLE_ID || '966897';
const articleName = process.env.RS_PRICE_ARTICLE_NAME || 'ALI FROKOSTKAFFE FILTERMALT 175G';
const increment = Number(process.env.RS_PRICE_INCREMENT || '2');

function formatNo(value) {
  return value.toLocaleString('nb-NO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseNo(value) {
  return Number(String(value).replace(/\s/g, '').replace(',', '.'));
}

async function getArticlePriceFromApi(page, id) {
  return page.evaluate(async (selectedArticleId) => {
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
    const article = (result.result || []).find((item) => item.articleId === selectedArticleId);
    if (!article) throw new Error(`Article ${selectedArticleId} was not found`);
    return {
      articleId: article.articleId,
      articleName: article.articleName,
      salesPrice: article.salesPrice
    };
  }, id);
}

async function openArticleDetails(page, id) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${id}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('heading', { name: 'Fullstendige varedetaljer' })).toBeVisible();
  await expect(page.getByText(id).first()).toBeVisible();
}

async function openPriceEditDialog(page) {
  const priceEditButton = page.getByTitle('Rediger varepris');
  await expect(priceEditButton).toBeVisible();
  await priceEditButton.click();
  await expect(page.getByText('Rediger varepris')).toBeVisible();
}

async function fillSalesPrice(page, formattedPrice) {
  const dialog = page.locator('.modal-content, .modal-dialog').filter({ hasText: 'Rediger varepris' }).first();
  const salesPriceInput = dialog.locator('input[name="salesPrice"]').first();
  await expect(salesPriceInput).toBeVisible();
  await salesPriceInput.fill(formattedPrice);
  await salesPriceInput.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Lagre' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Lagre' }).click();
  await expect(page.getByText('Prisen ble lagret')).toBeVisible();
}

test.describe('RS Store price change', () => {
  test('endre salgspris på valgt vare synlig', async ({ page }, testInfo) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const before = await getArticlePriceFromApi(page, articleId);
    expect(before.articleName).toContain(articleName);

    const newPrice = before.salesPrice + increment;
    const newPriceFormatted = formatNo(newPrice);

    await openArticleDetails(page, articleId);
    await testInfo.attach('before-price-change', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png'
    });

    await openPriceEditDialog(page);
    await fillSalesPrice(page, newPriceFormatted);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    const after = await getArticlePriceFromApi(page, articleId);
    const effectiveImmediately = parseNo(formatNo(after.salesPrice)) === parseNo(newPriceFormatted);

    await testInfo.attach('price-change-result', {
      body: JSON.stringify({ before, after, increment, newPriceFormatted, effectiveImmediately }, null, 2),
      contentType: 'application/json'
    });
    await testInfo.attach('after-price-change', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png'
    });
  });
});
