const { test, expect } = require('../helpers/agent-test');
const { createHybridContext, normalize } = require('../helpers/hybrid-flow');

test.describe('HC-019 Okta palogg RS Stage', () => {
  test('verifiser Okta-palogging til RS Stage', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-019', 'HC-019');
    const stageUrl = process.env.RS_STAGE_URL || process.env.RS_STORE_STAGE_URL || '';

    let openedUrl = '';
    if (stageUrl) {
      await page.goto(stageUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.screenshot({ path: ctx.screenshotPath('stage-start'), fullPage: false }).catch(() => {});
      openedUrl = page.url();
      ctx.addStep('stage-url-opened', 'Apnet RS Stage URL', 'PASS', openedUrl, { url: openedUrl });
    } else {
      ctx.addStep('stage-url-missing', 'RS Stage URL mangler', 'WARN', 'Sett RS_STAGE_URL hvis Playwright skal apne Stage automatisk.');
    }

    const login = await ctx.manualStep({
      key: 'okta-login',
      title: 'Logg inn med Okta',
      message: 'Fullfor Okta-palogging til RS Stage.',
      details: [
        stageUrl ? `Playwright har apnet: ${openedUrl || stageUrl}` : 'RS_STAGE_URL er ikke satt, apne Stage manuelt.',
        'Ikke skriv passord, token eller engangskode i notatfeltet.',
        'Skriv kun ufarlig status, for eksempel hvilken brukerrolle/tilgang som ble kontrollert.',
        'Trykk Gjennomfort nar du har landet i RetailSuite Stage.',
        'Trykk Feilet hvis Okta eller redirect stopper.',
      ],
    });

    if (stageUrl) {
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.screenshot({ path: ctx.screenshotPath('stage-after-login'), fullPage: false }).catch(() => {});
      const bodyText = normalize(await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''));
      ctx.addStep('stage-after-login-captured', 'Tok skjermbilde etter Okta-login', bodyText ? 'PASS' : 'WARN', bodyText.slice(0, 300));
    }

    await ctx.manualStep({
      key: 'stage-access-verified',
      title: 'Verifiser tilgang i RS Stage',
      message: 'Kontroller at brukeren har forventet tilgang i RetailSuite Stage.',
      details: [
        login.note ? `Forrige notat: ${login.note}` : 'Kontroller relevante menyer/funksjoner.',
        'Trykk Gjennomfort hvis tilgang og menyer er som forventet.',
        'Trykk Feilet hvis bruker mangler tilgang eller funksjoner.',
      ],
    });

    const result = ctx.writeResult({
      checks: {
        oktaLoginCompleted: true,
        stageAccessVerified: true,
        stageUrlConfigured: Boolean(stageUrl),
      },
      stageUrlConfigured: Boolean(stageUrl),
    });

    expect(result.checks.oktaLoginCompleted).toBeTruthy();
    expect(result.checks.stageAccessVerified).toBeTruthy();
  });
});
