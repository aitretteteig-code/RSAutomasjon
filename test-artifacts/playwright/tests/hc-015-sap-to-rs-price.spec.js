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

const connectorPath = getNetworkPath(
  '\\\\ngvrspreproc01u\\d$\\RSConnector-Data\\RsConnectorArticlesToVismaRS',
  '\\\\NGVRSPREPRST01P\\d$\\RSConnector-Data\\RsConnectorArticlesToVismaRS',
);
const preProcessorPath = getNetworkPath(
  '\\\\ngvrspreproc01u\\d$\\PreProcessor\\Output',
  '\\\\NGVRSPREPRST01P\\d$\\PreProcessor\\Output',
);

test.describe('HC-015 INT-003 SAP til RS', () => {
  test('verifiser prisendring fra SAP via connector og preprocessor til RS Store', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-015', 'HC-015');

    const sapChange = await ctx.manualStep({
      key: 'sap-price-change',
      title: 'Gjor prisendring i SAP',
      message: 'Gjor en prisendring pa en Meny-vare i riktig SAP-miljo.',
      details: [
        'Test: R3T. Stage: R3Q.',
        'Skriv artikkelnummer, ny pris og miljo i notatfeltet.',
        'Forventet: Prisendringen lagres og sendes videre.',
      ],
    });

    const articleReference =
      noteValue(sapChange.note, /(?:artikkel|vare|article)\D*(\d{4,14})/i) ||
      noteValue(sapChange.note, /\b(\d{4,14})\b/);

    const connector = inspectNetworkFolder(connectorPath, ctx, 'connector');
    if (!connector.accessible) {
      await ctx.manualStep({
        key: 'connector-file-manual',
        title: 'Verifiser fil i RS Connector',
        message: 'Playwright kunne ikke lese connector-stien automatisk. Kontroller mottak manuelt.',
        details: [
          `Sti: ${connectorPath}`,
          `Automatisk feilmelding: ${connector.error}`,
          ...articleManualDetails({ articleId: articleReference }, 'Vare fra SAP-steget'),
          'Trykk Gjennomfort hvis filen finnes i connector.',
          'Trykk Feilet hvis filen mangler.',
        ],
      });
    }

    const preProcessor = inspectNetworkFolder(preProcessorPath, ctx, 'preprocessor');
    if (!preProcessor.accessible) {
      await ctx.manualStep({
        key: 'preprocessor-file-manual',
        title: 'Verifiser fil i PreProcessor output',
        message: 'Playwright kunne ikke lese PreProcessor-stien automatisk. Kontroller output manuelt.',
        details: [
          `Sti: ${preProcessorPath}`,
          `Automatisk feilmelding: ${preProcessor.error}`,
          ...articleManualDetails({ articleId: articleReference }, 'Vare fra SAP-steget'),
          'Trykk Gjennomfort hvis filen finnes/prosesseres i output.',
          'Trykk Feilet hvis prosesseringen stopper.',
        ],
      });
    }

    const articlePage = await openRsStoreRoute(page, ctx, 'articles/article/listwithdetails', 'article-price-from-sap', /Artikkel|Article|Vare|Pris/i);
    const articleIdentity = await resolveArticleIdentity(page, articleReference);
    if (articleReference) {
      await searchPageText(page, ctx, articleReference, 'article-price-from-sap-search');
    }

    await ctx.manualStep({
      key: 'rs-store-price-verified',
      title: 'Verifiser pris i RS Store',
      message: 'Kontroller at artikkelen er oppdatert i RS Store med ny pris fra SAP.',
      details: [
        `Artikkelside apnet av Playwright: ${articlePage.url}`,
        ...articleManualDetails(articleIdentity, 'Vare som ble endret'),
        articleReference ? `Forsokt artikkelreferanse: ${articleReference}` : 'Ingen artikkelreferanse ble oppgitt.',
        'Trykk Gjennomfort hvis RS Store viser ny pris.',
        'Trykk Feilet hvis pris mangler eller er feil.',
      ],
    });

    const result = ctx.writeResult({
      checks: {
        sapPriceChanged: true,
        connectorChecked: true,
        preProcessorChecked: true,
        rsStoreArticlePageOpened: articlePage.visible,
      },
      articleReference,
      articleIdentity,
      connector,
      preProcessor,
    });

    expect(result.result).toBe('PASS');
  });
});
