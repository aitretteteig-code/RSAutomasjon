const { test, expect } = require('../helpers/agent-test');
const { clickAgentControl, expectAgentText } = require('../helpers/agent-actions');
const { articleManualDetails, resolveArticleIdentity } = require('../helpers/article-reference');
const { createHybridContext, openRsStoreRoute, searchPageText } = require('../helpers/hybrid-flow');

const defaultArticleCandidates = (process.env.HC013_ARTICLE_CANDIDATES || process.env.HC013_ARTICLE_ID || process.env.RS_PRICE_ARTICLE_ID || '757709,763456,764340')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const defaultPriceIncrement = Number(process.env.HC013_PRICE_INCREMENT || process.env.RS_PRICE_INCREMENT || '1');

function formatNo(value) {
  return value.toLocaleString('nb-NO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
        status: querySvc.getDefaultArticleSearchStatuses(),
      },
    };
    const result = await service.extendedSearch(payload).$promise;
    const article = (result.result || []).find((item) => item.articleId === selectedArticleId);
    if (!article) throw new Error(`Article ${selectedArticleId} was not found`);
    return {
      articleId: article.articleId,
      articleName: article.articleName,
      salesPrice: article.salesPrice,
    };
  }, id);
}

async function openArticleDetails(page, articleId) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  const detailsHeading = page.getByRole('heading', { name: 'Fullstendige varedetaljer', exact: true }).first();
  if (await detailsHeading.isVisible({ timeout: 10000 }).catch(() => false)) {
    await expect(detailsHeading).toBeVisible({ timeout: 30000 });
  } else {
    await expectAgentText(page, {
      label: 'article details page',
      names: ['Fullstendige varedetaljer', 'Generell informasjon', 'Priser', articleId],
      timeout: 30000,
      minScore: 0.42,
    });
  }
  await expect(page.getByText(articleId, { exact: true }).first()).toBeVisible({ timeout: 30000 });
}

async function openPriceEditDialog(page) {
  const priceEditButton = page.getByTitle('Rediger varepris').first();
  if (await priceEditButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await priceEditButton.click();
  } else {
    await clickAgentControl(page, {
      label: 'rediger varepris',
      names: ['Rediger varepris', 'Priser Rediger', 'Rediger'],
      timeout: 30000,
      minScore: 0.45,
    });
  }
  await expect(page.getByText('Rediger varepris')).toBeVisible({ timeout: 30000 });
}

async function fillSalesPrice(page, formattedPrice) {
  const dialog = page.locator('.modal-content, .modal-dialog').filter({ hasText: 'Rediger varepris' }).first();
  const salesPriceInput = dialog.locator('input[name="salesPrice"]:visible').first();
  const cssSpinner = dialog.locator('.sk-spinner, .spinner, [class*="spinner"], [class*="loading"]').first();
  const loadingText = dialog.getByText(/Laster/i).first();
  try {
    await expect(salesPriceInput).toBeVisible({ timeout: 30000 });
  } catch (error) {
    const dialogText = (await dialog.innerText({ timeout: 2000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
    const spinnerVisible =
      (await cssSpinner.isVisible({ timeout: 1000 }).catch(() => false)) ||
      (await loadingText.isVisible({ timeout: 1000 }).catch(() => false));
    throw new Error(
      [
        'Prisdialogen åpnet, men salgsprisfeltet ble aldri synlig.',
        spinnerVisible ? 'Dialogen viser fortsatt lasting/spinner.' : '',
        dialogText ? `Synlig dialogtekst: ${dialogText.slice(0, 300)}` : '',
        'Dette skjer ofte når RS Store-kallet for prisdetaljer feiler, f.eks. price/extended 500.',
        error.message,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  await salesPriceInput.fill(formattedPrice);
  await salesPriceInput.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Lagre' })).toBeEnabled({ timeout: 30000 });
  await dialog.getByRole('button', { name: 'Lagre' }).click();
  await expect(page.getByText('Prisen ble lagret')).toBeVisible({ timeout: 30000 });
}

async function closePriceDialog(page) {
  const closeButton = page.locator('.modal-content, .modal-dialog').filter({ hasText: 'Rediger varepris' }).first().getByRole('button').first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click().catch(() => {});
    await page.waitForTimeout(500);
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

async function changeCandidateSalesPriceInRsStore(page, ctx, articleId) {
  const increment = Number.isFinite(defaultPriceIncrement) && defaultPriceIncrement !== 0 ? defaultPriceIncrement : 1;

  await openRsStoreRoute(
    page,
    ctx,
    `articles/article/listwithdetails?id=${articleId}`,
    'article-before-automatic-price-change',
    /Fullstendige varedetaljer|Vare|Pris/i,
  );

  const before = await getArticlePriceFromApi(page, articleId);
  const newPrice = before.salesPrice + increment;
  const newPriceFormatted = formatNo(newPrice);

  await openArticleDetails(page, articleId);
  await page.screenshot({ path: ctx.screenshotPath('rs-store-price-before'), fullPage: false }).catch(() => {});

  await openPriceEditDialog(page);
  await fillSalesPrice(page, newPriceFormatted).catch(async (error) => {
    await page.screenshot({ path: ctx.screenshotPath(`rs-store-price-dialog-stuck-${articleId}`), fullPage: false }).catch(() => {});
    await closePriceDialog(page);
    throw error;
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const after = await getArticlePriceFromApi(page, articleId);
  const verified = parseNo(formatNo(after.salesPrice)) === parseNo(newPriceFormatted);
  await page.screenshot({ path: ctx.screenshotPath('rs-store-price-after'), fullPage: false }).catch(() => {});

  ctx.addStep(
    'rs-price-change',
    'Automatisk prisendring i RS Store',
    verified ? 'PASS' : 'FAIL',
    verified ? `Endret salgspris fra ${formatNo(before.salesPrice)} til ${newPriceFormatted}.` : 'Ny salgspris ble ikke verifisert etter lagring.',
    {
      articleId,
      articleName: after.articleName || before.articleName,
      beforePrice: before.salesPrice,
      afterPrice: after.salesPrice,
      expectedPrice: newPrice,
    },
  );

  expect(verified, `Salgspris for ${articleId} ble ikke verifisert etter automatisk endring.`).toBeTruthy();
  return {
    articleReference: articleId,
    articleIdentity: {
      articleId,
      name: after.articleName || before.articleName,
    },
    before,
    after,
    newPriceFormatted,
  };
}

async function changeSalesPriceInRsStore(page, ctx) {
  const failures = [];

  for (const articleId of defaultArticleCandidates) {
    try {
      const result = await changeCandidateSalesPriceInRsStore(page, ctx, articleId);
      if (failures.length) {
        ctx.addStep(
          'rs-price-candidate-fallback',
          'Agent-assistert kandidatbytte for prisendring',
          'WARN',
          `Første kandidat(er) feilet i prisdialogen, men Playwright fortsatte med ${articleId}.`,
          { failures },
        );
      }
      return result;
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      failures.push({ articleId, error: message.slice(0, 800) });
      ctx.addStep(
        `rs-price-change-${articleId}`,
        `Prisendring feilet for ${articleId}`,
        'WARN',
        message,
      );
    }
  }

  throw new Error(
    `Ingen HC-013-kandidater kunne åpne og fylle prisdialogen. Kandidater forsøkt: ${defaultArticleCandidates.join(', ')}. ` +
      `Siste feil: ${failures[failures.length - 1]?.error || 'ukjent'}`,
  );
}

test.describe('HC-013 Flyt fra RS til periferi', () => {
  test('verifiser salgsprisendring fra RS Store til POS og vekt', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-013', 'HC-013');

    const priceChange = await changeSalesPriceInRsStore(page, ctx);
    const articleReference = priceChange.articleReference;

    const articlePage = await openRsStoreRoute(page, ctx, 'articles/article/listwithdetails', 'article-list', /Artikkel|Article|Vare|Pris/i);
    const articleIdentity = await resolveArticleIdentity(page, articleReference, priceChange.articleIdentity);
    let articleSearch = { searched: false, found: false };
    if (articleReference) {
      articleSearch = await searchPageText(page, ctx, articleReference, 'article-price-change');
    }
    const articleDetails = articleManualDetails(articleIdentity, 'Vare som ble endret');

    ctx.addStep(
      'rs-price-verified',
      'Automatisk verifisering av pris i RS Store',
      articlePage.visible && (!articleReference || articleSearch.found) ? 'PASS' : 'WARN',
      articlePage.visible
        ? `Prisendringen er lagret og verifisert via RS Store API. Ny pris: ${priceChange.newPriceFormatted}.`
        : 'Artikkelsiden ble ikke sikkert verifisert visuelt, men API-verifisering av prisendringen passerte.',
      {
        articlePageUrl: articlePage.url,
        articleReference,
        articleSearch,
        newPriceFormatted: priceChange.newPriceFormatted,
      },
    );

    await ctx.manualStep({
      key: 'pos-price-verified',
      title: 'Verifiser pris i POS',
      message: 'Kontroller at POS viser ny salgspris for vektvaren.',
      details: [
        ...articleDetails,
        'Trykk Gjennomfort hvis POS har ny pris.',
        'Trykk Feilet hvis POS ikke er oppdatert.',
      ],
    });

    await ctx.manualStep({
      key: 'scale-price-verified',
      title: 'Verifiser pris pa vekt',
      message: 'Kontroller at vekt/periferi viser ny salgspris for vektvaren.',
      details: [
        ...articleDetails,
        'Trykk Gjennomfort hvis vekt/periferi har ny pris.',
        'Trykk Feilet hvis vekt/periferi ikke er oppdatert.',
      ],
    });

    const result = ctx.writeResult({
      checks: {
        priceChangedInRsStore: true,
        articlePageOpened: articlePage.visible,
        posUpdated: true,
        scaleUpdated: true,
      },
      articleReference,
      articleIdentity,
    });

    expect(result.result).toBe('PASS');
  });
});
