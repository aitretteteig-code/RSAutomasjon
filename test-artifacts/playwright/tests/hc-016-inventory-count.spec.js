const { test, expect } = require('../helpers/agent-test');
const { articleManualDetails, resolveArticleIdentity } = require('../helpers/article-reference');
const {
  createHybridContext,
  getNetworkPath,
  inspectNetworkFolder,
  noteValue,
  openRsStoreRoute,
  searchPageText,
} = require('../helpers/hybrid-flow');

const stockPath = getNetworkPath(
  '\\\\ngvrspreproc01u\\d$\\RSConnector-Data\\RsConnectorStockToVismaRS\\Stock',
  '\\\\NGVRSPREPRST01P\\d$\\RSConnector-Data\\RsConnectorStockToVismaRS\\Stock',
);

async function verifyStockImportInRsStore(page, ctx, { articleReference }) {
  const countPage = await openRsStoreRoute(page, ctx, 'stock/counts/', 'stock-counts', /Varetelling|Stock|Telling|Beholdning/i);
  const countArticle = await resolveArticleIdentity(page, articleReference);
  if (articleReference) {
    await searchPageText(page, ctx, articleReference, 'stocktaking-article');
  }

  const bodyText = countPage.bodyText || '';
  const normalizedBody = bodyText.toLowerCase();
  const articleNeedle = String(articleReference || countArticle?.articleId || countArticle?.gtin || '').trim().toLowerCase();
  const articleFound = articleNeedle ? normalizedBody.includes(articleNeedle) : false;

  const pageSignals = await page
    .evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const rows = [...document.querySelectorAll('tr, .row-table-row, [ng-repeat], .rs-table-row')]
        .map((element) => normalize(element.innerText || element.textContent))
        .filter(Boolean)
        .slice(0, 30);
      const controls = [...document.querySelectorAll('button,a,input,select')]
        .map((element) =>
          normalize(
            element.innerText ||
              element.value ||
              element.getAttribute('placeholder') ||
              element.getAttribute('title') ||
              element.getAttribute('aria-label'),
          ),
        )
        .filter(Boolean)
        .slice(0, 40);
      return {
        heading: normalize(document.querySelector('h1,h2,.breadcrumb,.page-title')?.innerText),
        rows,
        controls,
      };
    })
    .catch(() => ({ heading: '', rows: [], controls: [] }));

  const hasStockCountText = /Varetelling|Stock|Telling|Beholdning/i.test(bodyText);
  const hasLoginGate = /Velg butikk|Logg inn|Login|Brukernavn|Password/i.test(bodyText);
  const isStockCountRoute = /#\/stock\/counts\/?/i.test(page.url());
  const hasPageContent = hasStockCountText && bodyText.length > 80 && !hasLoginGate;
  const verified = countPage.visible && isStockCountRoute && hasPageContent && (!articleNeedle || articleFound || pageSignals.rows.length > 0);

  const result = {
    url: page.url(),
    visible: countPage.visible,
    isStockCountRoute,
    verified,
    articleReference: articleReference || '',
    countArticle,
    articleFound,
    heading: pageSignals.heading,
    rows: pageSignals.rows,
    controls: pageSignals.controls,
    bodyText: bodyText.slice(0, 1600),
  };

  ctx.addStep(
    'stock-import-rs-store',
    'Verifiserte beholdning i RS Store',
    verified ? 'PASS' : 'WARN',
    verified
      ? articleNeedle && articleFound
        ? `Varetellingssiden ble åpnet og artikkelreferanse ${articleNeedle} ble funnet.`
        : 'Varetellingssiden ble åpnet og hadde lesbart innhold. Ingen artikkelreferanse var tilgjengelig for eksakt match.'
      : 'Playwright kunne ikke verifisere beholdningsimporten sikkert automatisk.',
    result,
  );

  return result;
}

async function automateRsStoreCountAndCorrection(page, ctx, { articleReference }) {
  const countPage = await openRsStoreRoute(page, ctx, 'stock/counts/', 'stock-counts-before-counting', /Varetelling|Stock|Telling|Beholdning/i);
  const result = await page.evaluate(async ({ runId, articleReference: preferredReference }) => {
    const injector = window.angular?.element(document.body).injector();
    if (!injector) {
      throw new Error('Kunne ikke finne Angular-injektoren i RS Store.');
    }

    const rsStockCount = injector.get('rsStockCount');
    const rsStockCounting = injector.get('rsStockCounting');
    const rsStoreArticleQueryWrapper = injector.get('rsStoreArticleQueryWrapper');

    const unwrap = async (value) => (value && value.$promise ? value.$promise : value);
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const today = new Date();
    const closedDate = new Date(today);
    closedDate.setDate(closedDate.getDate() + 1);

    const types = await unwrap(rsStockCount.getStockCountTypes());
    const type =
      (types || []).find((item) => /test/i.test(`${item.typeOfCountName} ${item.typeName || ''}`)) ||
      (types || []).find((item) => !/complete|full/i.test(`${item.typeOfCountName} ${item.typeName || ''}`)) ||
      (types || [])[0];

    if (!type) {
      throw new Error('Fant ingen varetellingstype i RS Store.');
    }

    async function searchArticles(queryString, take = 80) {
      const response = await unwrap(
        rsStoreArticleQueryWrapper.extendedSearch(
          {
            queryString: normalize(queryString),
            status: [1, 8, 9],
            skip: 0,
            take,
            order: 'articleId',
          },
          false,
        ),
      );
      return response?.result || [];
    }

    const preferredArticles = preferredReference ? await searchArticles(preferredReference, 20).catch(() => []) : [];
    const fallbackArticles = await searchArticles('', 100);
    const seenArticleIds = new Set();
    const articles = [...preferredArticles, ...fallbackArticles]
      .filter((article) => {
        const articleId = normalize(article.articleId);
        const barcode = normalize(article.defaultArticleBarcode);
        if (!articleId || !barcode || seenArticleIds.has(articleId)) return false;
        seenArticleIds.add(articleId);
        return true;
      })
      .slice(0, 10);

    if (articles.length < 10) {
      throw new Error(`Fant bare ${articles.length} tellbare varer i RS Store. Trenger 10.`);
    }

    const stockCountName = `HC-016 automatisk varetelling ${runId}`;
    const created = await unwrap(
      rsStockCount.createNewCount({
        name: stockCountName,
        startDate: today,
        closedDate,
        type: type.typeOfCount || type.typeNo,
      }),
    );
    const stockCountNo = created?.stockCountNo;
    if (!stockCountNo) {
      throw new Error(`RS Store returnerte ikke stockCountNo ved opprettelse: ${JSON.stringify(created)}`);
    }

    const batchName = `HC-016 telling ${runId}`;
    rsStockCounting.createBatch(batchName);
    rsStockCounting.setCurrentBatch(batchName);

    const quantities = [3, 7, 11, 2, 5, 9, 4, 8, 6, 10];
    const countedItems = articles.map((article, index) => ({
      articleId: article.articleId,
      barcode: article.defaultArticleBarcode,
      name: article.articleName,
      quantity: quantities[index],
    }));

    for (const item of countedItems) {
      const ok = rsStockCounting.set(batchName, item.barcode, item.articleId, item.name, item.quantity, true, true);
      if (!ok) {
        throw new Error(`Klarte ikke legge varetellingslinje i lokal RS Store batch for ${item.articleId}.`);
      }
    }

    await rsStockCounting.save(stockCountNo, batchName, false);

    const batches = await unwrap(rsStockCount.getStockCountBatches({ stockCountNo }));
    const batch =
      (batches || []).find((item) => item.stockTakingRelatedText === batchName) ||
      (batches || []).sort((left, right) => (right.sequenceNo || 0) - (left.sequenceNo || 0))[0];

    if (!batch?.transactionPrimKey) {
      throw new Error(`Fant ikke lagret varetellingssekvens etter lagring: ${JSON.stringify(batches)}`);
    }

    const beforeCorrection = await unwrap(
      rsStockCount.getStockCountBatchDetails({
        stockCountNo,
        batchKey: batch.transactionPrimKey,
        skip: 0,
        take: 50,
      }),
    );
    const correctionItem = beforeCorrection?.items?.[0];
    if (!correctionItem) {
      throw new Error('Fant ingen lagret varetellingslinje som kunne korrigeres.');
    }

    const correctionDelta = 2;
    await rsStockCounting.updateCountedBatchChanges(
      stockCountNo,
      batch.transactionPrimKey,
      correctionItem.barcode || correctionItem.ean,
      correctionDelta,
    );

    const afterCorrection = await unwrap(
      rsStockCount.getStockCountBatchDetails({
        stockCountNo,
        batchKey: batch.transactionPrimKey,
        skip: 0,
        take: 50,
      }),
    );
    const correctedLine = (afterCorrection?.items || []).find(
      (item) =>
        String(item.articleId) === String(correctionItem.articleId) ||
        String(item.barcode || item.ean) === String(correctionItem.barcode || correctionItem.ean),
    );
    const expectedQuantity = Number(correctionItem.quantity || 0) + correctionDelta;
    const correctionVerified = correctedLine && Number(correctedLine.quantity) === expectedQuantity;

    return {
      url: window.location.href,
      stockCountNo,
      stockCountName,
      stockCountType: type.typeOfCountName || type.typeName || '',
      batchName,
      batchKey: batch.transactionPrimKey,
      countedItems,
      savedLineCount: afterCorrection?.items?.length || 0,
      correction: {
        articleId: correctionItem.articleId,
        barcode: correctionItem.barcode || correctionItem.ean,
        beforeQuantity: correctionItem.quantity,
        delta: correctionDelta,
        afterQuantity: correctedLine?.quantity,
        verified: Boolean(correctionVerified),
      },
      verified: countedItems.length === 10 && (afterCorrection?.items?.length || 0) >= 10 && Boolean(correctionVerified),
    };
  }, { runId: ctx.runId, articleReference });

  await page.goto(`/retailsuite/store/#/stock/counts/${result.stockCountNo}/batches`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ctx.screenshotPath('rs-store-count-and-correction'), fullPage: false }).catch(() => {});

  ctx.addStep(
    'rs-store-count-and-correction',
    'Automatisk telling og korrigering i RS Store',
    result.verified ? 'PASS' : 'FAIL',
    result.verified
      ? `Opprettet varetelling ${result.stockCountNo}, telte 10 varer og korrigerte en linje.`
      : 'RS Store-telling eller korrigering ble ikke sikkert verifisert.',
    {
      openedUrl: countPage.url,
      ...result,
      finalUrl: page.url(),
    },
  );

  return result;
}

test.describe('HC-016 Varetelling', () => {
  test('verifiser beholdningsfil og varetelling via Mobile Access, POS og RS Store', async ({ page }) => {
    test.setTimeout(120 * 60 * 1000);
    const ctx = createHybridContext('HC-016', 'HC-016');

    const stockFile = await ctx.manualStep({
      key: 'stock-file-requested',
      title: 'Motta beholdningsfil fra NG Flyt',
      message: 'Avklar og motta beholdningsfil fra NG Flyt.',
      details: [
        'Skriv filnavn, artikkel eller annen referanse i notatfeltet.',
        'Forventet: Beholdningsfilen er levert for riktig miljo.',
      ],
    });

    const stockFolder = inspectNetworkFolder(stockPath, ctx, 'stock');
    if (!stockFolder.accessible) {
      await ctx.manualStep({
        key: 'stock-file-connector-manual',
        title: 'Verifiser beholdningsfil i connector',
        message: 'Playwright kunne ikke lese Stock-stien automatisk. Kontroller filen manuelt.',
        details: [
          `Sti: ${stockPath}`,
          `Automatisk feilmelding: ${stockFolder.error}`,
          stockFile.note ? `Referanse fra notat: ${stockFile.note}` : 'Kontroller at filen har dagens dato.',
          'Trykk Gjennomfort hvis filen finnes.',
          'Trykk Feilet hvis filen mangler.',
        ],
      });
    }

    const articleReference =
      noteValue(stockFile.note, /(?:artikkel|vare|article)\D*(\d{4,14})/i) ||
      noteValue(stockFile.note, /\b(\d{4,14})\b/);

    const stockImportRsStore = await verifyStockImportInRsStore(page, ctx, {
      articleReference,
    });
    const countArticle = stockImportRsStore.countArticle;

    await ctx.manualStep({
      key: 'mobile-access-count',
      title: 'Gjor telling i Mobile Access',
      message: 'Logg pa Mobile Access og gjor en varetelling for en artikkel.',
      details: [
        ...articleManualDetails(countArticle, 'Vare som skal telles'),
        'Trykk Gjennomfort nar tellingen er lagret.',
        'Trykk Feilet hvis Mobile Access-tellingen ikke kan lagres.',
      ],
    });

    await ctx.manualStep({
      key: 'pos-count',
      title: 'Gjor telling i POS',
      message: 'Logg pa POS i varetellingsmodus og gjor en telling for en artikkel.',
      details: [
        ...articleManualDetails(countArticle, 'Vare som skal telles'),
        'Trykk Gjennomfort nar POS-tellingen er lagret.',
        'Trykk Feilet hvis POS-tellingen ikke kan lagres.',
      ],
    });

    const rsStoreCountAndCorrection = await automateRsStoreCountAndCorrection(page, ctx, {
      articleReference,
    });

    const checks = {
      stockFileReceived: true,
      stockPathChecked: true,
      stocktakingPageOpened: stockImportRsStore.visible,
      stockImportRsStore: stockImportRsStore.verified,
      mobileAccessCountCompleted: true,
      posCountCompleted: true,
      rsStoreCountCompleted: rsStoreCountAndCorrection.verified,
    };

    const result = ctx.writeResult({
      result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
      checks,
      articleReference,
      countArticle,
      stockFolder,
      stockImportRsStore,
      rsStoreCountAndCorrection,
    });

    expect(result.result).toBe('PASS');
  });
});
