const knownArticles = new Map(
  [
    { articleId: '966897', name: 'ALI FROKOSTKAFFE FILTERMALT 175G', gtin: '7040913336660' },
    { articleId: '626669', name: 'TOMATKETCHUP 570G HEINZ', gtin: '87157239' },
    { articleId: '566071', name: 'HVITLOK&ROSMARIN MARINADE MENY 5KG SOLIN', gtin: '7090049730009' },
    { articleId: '757709', name: 'LAM YTREFILET MARINERT PR KG', gtin: '' },
    { articleId: '514687', name: 'BROKKOLISALAT M/BACON PR STK', gtin: '8962' },
    { articleId: '8140', name: 'HVETEBOLLE 100G STK', gtin: '8140' },
    { articleId: '8141', name: 'ROSINBOLLE 100G STK', gtin: '8141' },
    { articleId: '7038010002625', name: 'LITAGO MELK SJOKOLADE 0,5L TINE', gtin: '7038010002625' },
    { articleId: '7038010002663', name: 'LITAGO MELK JORDBAER 0,5L TINE', gtin: '7038010002663' },
  ].map((article) => [article.articleId, article])
);

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function firstNonEmpty(...values) {
  return values.map(normalize).find(Boolean) || '';
}

function gtinFromArticle(article = {}) {
  const direct = firstNonEmpty(
    article.gtin,
    article.GTIN,
    article.ean,
    article.EAN,
    article.barcode,
    article.Barcode,
    article.mainBarcode,
    article.primaryBarcode,
    article.defaultBarcode
  );
  if (direct) return direct;

  const barcodeCandidate = [article.barcodes, article.barcodesWithType, article.gtins, article.eans]
    .flat()
    .filter(Boolean)
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      return firstNonEmpty(item.gtin, item.ean, item.barcode, item.value, item.code);
    })
    .find(Boolean);
  return normalize(barcodeCandidate);
}

function normalizeArticle(article = {}) {
  const articleId = firstNonEmpty(article.articleId, article.id, article.articleNumber, article.itemId);
  const known = articleId ? knownArticles.get(articleId) : null;
  return {
    articleId,
    name: firstNonEmpty(article.name, article.articleName, article.description, known?.name),
    gtin: firstNonEmpty(gtinFromArticle(article), known?.gtin),
  };
}

function articleManualDetails(article = {}, label = 'Vare') {
  const normalized = normalizeArticle(article);
  return [
    `${label}: ${normalized.name || 'Ukjent varenavn'}`,
    `Vare-ID: ${normalized.articleId || 'ikke oppgitt'}`,
    `GTIN: ${normalized.gtin || 'ikke funnet automatisk'}`,
  ];
}

async function resolveArticleIdentity(page, reference, fallback = {}) {
  const cleanedReference = normalize(reference || fallback.articleId || fallback.gtin);
  const known = knownArticles.get(cleanedReference);
  const base = normalizeArticle({ ...known, ...fallback, articleId: fallback.articleId || known?.articleId || cleanedReference });

  if (!page || !cleanedReference) return base;

  const resolved = await page
    .evaluate(async (query) => {
      const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const pickGtin = (article) => {
        const directFields = [
          article.gtin,
          article.GTIN,
          article.ean,
          article.EAN,
          article.barcode,
          article.Barcode,
          article.mainBarcode,
          article.primaryBarcode,
          article.defaultBarcode,
        ].map(normalizeLocal).filter(Boolean);
        if (directFields.length) return directFields[0];
        return [article.barcodes, article.barcodesWithType, article.gtins, article.eans]
          .flat()
          .filter(Boolean)
          .map((item) => {
            if (typeof item === 'string' || typeof item === 'number') return String(item);
            return normalizeLocal(item.gtin || item.ean || item.barcode || item.value || item.code);
          })
          .find(Boolean) || '';
      };

      const angularRef = window.angular;
      const body = document.body;
      if (!angularRef || !body) return null;
      const injector = angularRef.element(body).injector();
      if (!injector) return null;
      const service = injector.get('rsStoreArticleService');
      const querySvc = injector.get('rsArticleSearchQueryService');
      const payload = {
        skip: 0,
        take: 10,
        orderBy: 'articleName',
        excludeRestrictedArticles: false,
        extendedParameters: {
          queryString: query,
          status: querySvc.getDefaultArticleSearchStatuses(),
        },
      };
      const result = await service.extendedSearch(payload).$promise;
      const articles = result.result || [];
      const article =
        articles.find((item) => normalizeLocal(item.articleId) === query) ||
        articles.find((item) => pickGtin(item) === query) ||
        articles[0];
      if (!article) return null;
      return {
        articleId: normalizeLocal(article.articleId),
        name: normalizeLocal(article.articleName || article.name || article.description),
        gtin: pickGtin(article),
      };
    }, cleanedReference)
    .catch(() => null);

  return normalizeArticle({ ...base, ...resolved });
}

module.exports = {
  articleManualDetails,
  normalizeArticle,
  resolveArticleIdentity,
};
