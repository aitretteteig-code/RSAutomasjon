const { test, expect } = require('../helpers/agent-test');
const { articleManualDetails, resolveArticleIdentity } = require('../helpers/article-reference');
const { createHybridContext, noteValue, openRsStoreRoute, searchPageText } = require('../helpers/hybrid-flow');

test.describe('HC-014 Svinn RS Store og Mobile Access', () => {
  test('verifiser svinn fra RS Store og Mobile Access i lagerjusteringer', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-014', 'HC-014');

    const rsWaste = await ctx.manualStep({
      key: 'rs-store-waste',
      title: 'Registrer svinn i RS Store',
      message: 'Registrer en svinntransaksjon i RS Store pa en egnet testvare.',
      details: [
        'Skriv vare, mengde og eventuell referanse i notatfeltet.',
        'Forventet: Svinntransaksjonen lagres i RS Store.',
      ],
    });

    const mobileWaste = await ctx.manualStep({
      key: 'mobile-access-waste',
      title: 'Registrer svinn i Mobile Access',
      message: 'Registrer en svinntransaksjon i Mobile Access pa en egnet testvare.',
      details: [
        'Bruk gjerne samme vare som RS Store-steget hvis det passer.',
        'Skriv vare, mengde og eventuell referanse i notatfeltet.',
        'Forventet: Svinntransaksjonen lagres i Mobile Access.',
      ],
    });

    const wasteReference =
      noteValue(`${rsWaste.note} ${mobileWaste.note}`, /(?:artikkel|vare|article)\D*(\d{4,14})/i) ||
      noteValue(`${rsWaste.note} ${mobileWaste.note}`, /\b(\d{4,14})\b/);

    const adjustments = await openRsStoreRoute(page, ctx, 'stockadjustments/list', 'stock-adjustments', /Lagerjustering|Svinn|Stock|Justering/i);
    const wasteArticle = await resolveArticleIdentity(page, wasteReference);
    if (wasteReference) {
      await searchPageText(page, ctx, wasteReference, 'waste-reference');
    }

    await ctx.manualStep({
      key: 'stock-adjustments-verified',
      title: 'Verifiser lagerjusteringer',
      message: 'Kontroller at svinn fra bade RS Store og Mobile Access vises under lagerjusteringer.',
      details: [
        `Lagerjusteringer apnet av Playwright: ${adjustments.url}`,
        ...articleManualDetails(wasteArticle, 'Vare brukt til svinn'),
        wasteReference ? `Forsokt vare/referanse: ${wasteReference}` : 'Ingen sikker vare/referanse ble oppgitt.',
        'Trykk Gjennomfort hvis begge kilder vises.',
        'Trykk Feilet hvis en kilde mangler.',
      ],
    });

    const result = ctx.writeResult({
      checks: {
        rsStoreWasteRegistered: true,
        mobileAccessWasteRegistered: true,
        stockAdjustmentsOpened: adjustments.visible,
      },
      wasteReference,
      wasteArticle,
    });

    expect(result.result).toBe('PASS');
  });
});
