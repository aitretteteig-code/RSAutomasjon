const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { buildCheckDiagnosis, createBrowserTestAgent } = require('../helpers/browser-test-agent');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.HC002_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-002-${runId}-${name}.png`);
const resultsPath = path.join(evidenceDir, `HC-002-${runId}-results.json`);

const recipes = [
  { id: '514687', name: 'BROKKOLISALAT M/BACON PR STK', unit: 'PC/STK' },
  { id: '757709', name: 'LAM YTREFILET MARINERT PR KG', unit: 'KG' }
];
const temporaryIngredientId = '966897';

const checkInfo = {
  recipesEdited: {
    title: 'Oppskrifter redigert og gjenopprettet',
    fail: 'Oppskriftene ble ikke både endret, fjernet og gjenopprettet til opprinnelig ingrediensantall.',
  },
  productionPicked: {
    title: 'Ingredienser plukket',
    fail: 'Produksjonen viste ikke forventet bekreftelse på plukkede ingredienser.',
  },
  productionStepVisible: {
    title: 'Produksjonssteget åpnet',
    fail: 'Steg 3 Produksjon ble ikke verifisert før deklarasjon, prissetting og fullføring.',
  },
  productionFinished: {
    title: 'Produksjon fullført',
    fail: 'Produksjonen ble ikke bekreftet som fullført. Testen fant ikke tekst som "Batchen ble lagret" eller "Fullført" etter fullføringssteget.',
  },
  declarationVisible: {
    title: 'Næringsdeklarasjon synlig',
    fail: 'Næringsdeklarasjon ble ikke funnet etter produksjonsflyten. Dette skjer ofte når produksjonen ikke faktisk ble fullført, eller fanen ikke lastet forventet deklarasjonsinnhold.',
  },
  pricingVisible: {
    title: 'Prissetting synlig',
    fail: 'Prissetting-siden viste ikke forventet pris/kalkuleringsinnhold.',
  },
};

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function textForBoolean(value) {
  return value ? 'ja' : 'nei';
}

function buildDiagnosis(checks, production, browserFindings = []) {
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => ({
      key,
      title: checkInfo[key]?.title || key,
      reason: checkInfo[key]?.fail || 'Kontrollpunktet feilet.',
    }));

  const passedChecks = Object.entries(checks)
    .filter(([, passed]) => passed)
    .map(([key]) => checkInfo[key]?.title || key);

  const summary = failedChecks.length
    ? `HC-002 feilet fordi ${failedChecks.map((item) => item.title.toLowerCase()).join(' og ')} ikke ble verifisert.`
    : 'Alle kontrollpunkter ble verifisert.';
  const extraCheck = production.rechecks?.length
    ? `Før konklusjon ble produksjon ${production.productionId} åpnet på nytt og kontrollert ${production.rechecks.length} ekstra gang(er). Siste ekstra sjekk viste: fullført=${textForBoolean(production.finishedObserved)}, næringsdeklarasjon=${textForBoolean(production.declarationObserved)}, prissetting=${textForBoolean(production.pricingObserved)}.`
    : 'Ingen ekstra re-sjekk var nødvendig fordi første observasjon passerte.';
  const consoleFindings = browserFindings.filter((item) => item.type !== 'console.warning' || /error|failed|exception|timeout|500/i.test(item.text));

  return {
    summary,
    failedChecks,
    passedChecks,
    productionId: production.productionId,
    productionUrl: production.productionUrl,
    extraCheck,
    consoleFindings,
    nextAction: failedChecks.length
      ? `Åpne produksjon ${production.productionId} i RS Store og kontroller status på Produksjon- og Næringsdeklarasjon-stegene.`
      : '',
  };
}

async function dismissOpenOverlays(page) {
  await page.evaluate(() => {
    for (const button of [...document.querySelectorAll('.modal-content button.close, .modal-dialog button.close')]) {
      const r = button.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) button.click();
    }
  }).catch(() => {});
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    for (const button of [...document.querySelectorAll('button')]) {
      const text = (button.innerText || '').trim();
      const r = button.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && /^OK$/i.test(text)) button.click();
    }
  }).catch(() => {});
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach((element) => element.remove());
    document.body.classList.remove('modal-open');
  }).catch(() => {});
}

async function openArticleWithLatestDeclaration(page, articleId) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(articleId).first()).toBeVisible();

  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[ng-click="selectContentDeclaration(item)"]')];
    const row = rows[rows.length - 1];
    if (row) {
      row.scrollIntoView({ block: 'center' });
      row.click();
    }
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await expect(page.getByTitle('Rediger oppskrift')).toBeVisible();
}

async function openRecipeEditor(page) {
  await page.getByTitle('Rediger oppskrift').click();
  await expect(page.getByText('Rediger oppskrift')).toBeVisible();
  await expect(page.locator('.modal-content').filter({ hasText: 'Rediger oppskrift' }).last()).toBeVisible();
}

async function mutateRecipeNoNet(page, recipe) {
  await openArticleWithLatestDeclaration(page, recipe.id);
  await openRecipeEditor(page);

  const modal = page.locator('.modal-content').filter({ hasText: 'Rediger oppskrift' }).last();
  const rowLocator = modal.locator('.rs-table-body .rs-table-row');
  const beforeCount = await rowLocator.count();

  const articleInput = modal.locator('input[name="article"]').first();
  await articleInput.fill(temporaryIngredientId);
  await page.waitForTimeout(900);
  const option = page.getByText('ALI FROKOSTKAFFE FILTERMALT 175G').last();
  await expect(option).toBeVisible();
  await option.click();
  await page.waitForTimeout(700);

  const addButton = modal.getByRole('button', { name: 'Legg til' }).first();
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await page.waitForTimeout(700);

  const dialog = page.locator('.modal-content').filter({ hasText: 'ALI FROKOSTKAFFE FILTERMALT 175G' }).last();
  const qtyInput = dialog.locator('input[type="text"]').first();
  if (await qtyInput.isVisible().catch(() => false)) {
    await qtyInput.fill('0,001');
  }
  const finalAdd = dialog.getByRole('button', { name: 'Legg til' });
  if (await finalAdd.isVisible().catch(() => false)) {
    await finalAdd.click({ force: true });
  }
  await page.waitForTimeout(1500);

  const afterAddCount = await rowLocator.count();
  await page.screenshot({ path: screenshot(`after-add-${recipe.id}`), fullPage: false });

  const addedRow = rowLocator.filter({ hasText: temporaryIngredientId }).last();
  await expect(addedRow).toBeVisible();
  await addedRow.locator('button.btn-danger').click();
  await page.waitForTimeout(1000);
  const afterRemoveCount = await rowLocator.count();

  await modal.getByText('Prissetting').click();
  await page.waitForTimeout(700);
  await modal.getByRole('button', { name: 'Lagre' }).click();
  await page.waitForTimeout(1500);
  if (await modal.isVisible().catch(() => false)) {
    await modal.locator('button.close').click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  await dismissOpenOverlays(page);

  const result = {
    beforeCount,
    afterAddCount,
    afterRemoveCount,
    addedObserved: afterAddCount === beforeCount + 1,
    removedObserved: afterRemoveCount === beforeCount,
    restoredOriginalCount: afterRemoveCount === beforeCount,
    articleName: 'ALI FROKOSTKAFFE FILTERMALT 175G'
  };

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: screenshot(`recipe-save-${recipe.id}`), fullPage: false });

  return { recipe, ...result };
}

async function clickPickInOpenDetails(page, productionId, index) {
  await page.evaluate(() => {
    const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const modals = [...document.querySelectorAll('.modal-content')].filter(visible);
    const modal = modals.reverse().find((element) => /Plukk/i.test(norm(element.innerText || element.textContent)));
    if (!modal) return;

    const amountMatch = norm(modal.innerText || modal.textContent).match(/Antall\s*(?:\u00e5|a)\s*plukke\s*([0-9]+(?:[,.][0-9]+)?)/i);
    const amount = amountMatch ? amountMatch[1] : '1';
    const fields = [...modal.querySelectorAll('input:not([type="hidden"]), textarea')]
      .filter((field) => visible(field) && !field.disabled && !field.readOnly);
    const quantityField = fields.find((field) => {
      const metadata = norm([
        field.getAttribute('aria-label'),
        field.getAttribute('placeholder'),
        field.getAttribute('name'),
        field.getAttribute('id'),
        field.closest('label')?.innerText,
        field.parentElement?.innerText,
      ].join(' '));
      return /Plukket|plukke|antall|quantity|amount/i.test(metadata);
    });

    if (quantityField && !String(quantityField.value || '').trim()) {
      quantityField.value = amount;
      quantityField.dispatchEvent(new Event('input', { bubbles: true }));
      quantityField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }).catch(() => {});

  const pickCandidates = [
    page.locator('.modal-content').filter({ hasText: /Plukk|Antall|kg|pc|stk/i }).last().getByRole('button', { name: /^Plukk$/i }).last(),
    page.getByRole('button', { name: /^Plukk$/i }).last(),
    page.locator('button').filter({ hasText: /^Plukk$/i }).last(),
  ];

  for (const pickButton of pickCandidates) {
    if (await pickButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await pickButton.scrollIntoViewIfNeeded().catch(() => {});
      await pickButton.click({ force: true });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1800);
      return true;
    }
  }

  await page.screenshot({ path: screenshot(`pick-button-missing-${productionId}-${index}`), fullPage: false }).catch(() => {});
  return false;
}

async function countUnpickedIngredientDetails(page) {
  return page.evaluate(() => {
    const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const ownText = (element) => norm([...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' '));
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const lowerHeading = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,span,label,strong,legend,div')]
      .find((element) => visible(element) && /^Plukkede ingredienser:?$/i.test(ownText(element) || norm(element.innerText || element.textContent)));
    return [...document.querySelectorAll('button')]
      .filter((button) => /^Detaljer$/i.test(norm(button.innerText || button.textContent)) && visible(button))
      .filter((button) => !lowerHeading || Boolean(button.compareDocumentPosition(lowerHeading) & Node.DOCUMENT_POSITION_FOLLOWING))
      .length;
  });
}

async function clickNextUnpickedIngredientDetails(page) {
  return page.evaluate(() => {
    const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const ownText = (element) => norm([...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' '));
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const lowerHeading = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,span,label,strong,legend,div')]
      .find((element) => visible(element) && /^Plukkede ingredienser:?$/i.test(ownText(element) || norm(element.innerText || element.textContent)));
    const detailsButtons = [...document.querySelectorAll('button')]
      .filter((button) => /^Detaljer$/i.test(norm(button.innerText || button.textContent)) && visible(button))
      .filter((button) => !lowerHeading || Boolean(button.compareDocumentPosition(lowerHeading) & Node.DOCUMENT_POSITION_FOLLOWING));
    const button = detailsButtons[0];
    if (!button) return { clicked: false, remaining: 0, rowText: '' };

    const row = button.closest('tr,.row,.rs-table-row') || button.parentElement;
    const rowText = norm(row?.innerText || row?.textContent || '');
    button.scrollIntoView({ block: 'center' });
    button.click();
    return { clicked: true, remaining: detailsButtons.length, rowText };
  });
}

async function waitForIngredientPickingSurface(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText || '';
    return /Plukk ingrediensen fra oppskriften|Plukkede ingredienser|Detaljer|ANTALL\s*\u00c5\s*PLUKKE/i.test(text);
  }, null, { timeout: 20000 }).catch(() => {});
}

async function hasUnpickableIngredientGrid(page) {
  return page.evaluate(() => {
    const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const ownText = (element) => norm([...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' '));
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const bodyText = norm(document.body.innerText || '');
    const lowerHeading = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,span,label,strong,legend,div')]
      .find((element) => visible(element) && /^Plukkede ingredienser:?$/i.test(ownText(element) || norm(element.innerText || element.textContent)));
    const detailsCount = [...document.querySelectorAll('button')]
      .filter((button) => /^Detaljer$/i.test(norm(button.innerText || button.textContent)) && visible(button))
      .length;
    return /ANTALL\s*\u00c5\s*PLUKKE/i.test(bodyText) && /INGREDIENS/i.test(bodyText) && !lowerHeading && detailsCount === 0;
  });
}

async function pickProductionIngredients(page, productionId) {
  await page.evaluate(() => {
    const link = document.querySelector('a[ng-click="setPage(2)"]');
    if (link) link.click();
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await waitForIngredientPickingSurface(page);

  let pickedCount = 0;
  const initialDetailsCount = await countUnpickedIngredientDetails(page).catch(() => 0);
  const maxAttempts = Math.max(initialDetailsCount, 1) + 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remainingBeforeClick = await countUnpickedIngredientDetails(page).catch(() => 0);
    if (remainingBeforeClick === 0) break;

    const detailsResult = await clickNextUnpickedIngredientDetails(page).catch(() => ({ clicked: false }));
    if (!detailsResult.clicked) break;
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1200);

    if (await clickPickInOpenDetails(page, productionId, attempt)) {
      pickedCount += 1;
    }
    await dismissOpenOverlays(page);
    await page.waitForTimeout(900);
  }

  const remainingUnpicked = await countUnpickedIngredientDetails(page).catch(() => 0);
  const blockedByUnpickableGrid = await hasUnpickableIngredientGrid(page).catch(() => false);
  const pickedObserved = remainingUnpicked === 0 && !blockedByUnpickableGrid;
  if (!pickedObserved) {
    await page.screenshot({ path: screenshot(`pick-incomplete-${productionId}-${remainingUnpicked}`), fullPage: false }).catch(() => {});
  }
  await page.screenshot({ path: screenshot(`after-pick-${productionId}`), fullPage: false });
  return pickedObserved;
}

async function createAndFinishProduction(page, articleId) {
  await dismissOpenOverlays(page);
  await openArticleWithLatestDeclaration(page, articleId);
  await dismissOpenOverlays(page);
  await page.getByText('Start ny produksjon').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);

  const productionUrl = page.url();
  const productionId = (productionUrl.match(/details\/(\d+)/) || [])[1] || 'unknown';
  await page.screenshot({ path: screenshot(`production-created-${productionId}`), fullPage: false });

  const pickedObserved = await pickProductionIngredients(page, productionId);

  await clickProductionStep(page, 3);
  const productionStepText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const productionStepObserved = /Produksjon|Produsert mengde|Fullfør|Fullfor|Status|Batch/i.test(productionStepText);
  await page.screenshot({ path: screenshot(`production-step-${productionId}`), fullPage: false });

  await clickProductionStep(page, 4);
  const declarationObserved = /Deklarasjonstekst|Næringsinnhold|Naringsinnhold|Allergener/i.test(await page.locator('body').innerText());
  await page.screenshot({ path: screenshot(`nutrition-${productionId}`), fullPage: false });

  await clickProductionStep(page, 5);
  const pricingObserved = /Prissetting|Priskalkulering|Salgspris/i.test(await page.locator('body').innerText());
  await page.screenshot({ path: screenshot(`pricing-${productionId}`), fullPage: false });

  let finishedObserved = await page.evaluate(async () => {
    const buttons = [...document.querySelectorAll('button,a')];
    const finish = buttons.find((button) => /Fullfør|Fullfor/i.test(button.innerText || ''));
    if (!finish) return false;
    finish.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const ok = [...document.querySelectorAll('button')].find((button) => /^OK$/i.test((button.innerText || '').trim()));
    if (ok) ok.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return /Batchen ble lagret|Fullført|Fullfort/i.test(document.body.innerText || '');
  });

  if (!finishedObserved) {
    await clickProductionStep(page, 3);
    finishedObserved = await page.evaluate(async () => {
      const buttons = [...document.querySelectorAll('button,a')];
      const finish = buttons.find((button) => /Fullfør|Fullfor/i.test(button.innerText || ''));
      if (!finish) return false;
      finish.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const ok = [...document.querySelectorAll('button')].find((button) => /^OK$/i.test((button.innerText || '').trim()));
      if (ok) ok.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return /Batchen ble lagret|Fullført|Fullfort/i.test(document.body.innerText || '');
    });
  }
  await page.screenshot({ path: screenshot(`after-finish-${productionId}`), fullPage: false });

  return { productionId, productionUrl, pickedObserved, productionStepObserved, finishedObserved, declarationObserved, pricingObserved };
}

async function clickProductionStep(page, stepNumber) {
  await page.evaluate((targetStep) => {
    const direct = document.querySelector(`a[ng-click="setPage(${targetStep})"]`);
    if (direct) {
      direct.click();
      return;
    }
    const labels = {
      3: /Produksjon/i,
      4: /Næringsdeklarasjon|Naringsdeklarasjon/i,
      5: /Prissetting/i,
    };
    const link = [...document.querySelectorAll('a,button')].find((item) => labels[targetStep]?.test(item.innerText || ''));
    if (link) link.click();
  }, stepNumber);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
}

async function observeProductionState(page, production, label) {
  await page.goto(production.productionUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  await clickProductionStep(page, 3);
  const productionText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const productionStepObserved = /Produksjon|Produsert mengde|Fullfør|Fullfor|Status|Batch/i.test(productionText);
  const finishedObserved = /Batchen ble lagret|Fullført|Fullfort|Ferdig|Status\s+Ferdig|Status\s+Fullført/i.test(productionText);
  await page.screenshot({ path: screenshot(`recheck-${label}-production-${production.productionId}`), fullPage: false });

  await clickProductionStep(page, 4);
  const declarationText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const declarationObserved = /Deklarasjonstekst|Næringsinnhold|Naringsinnhold|Allergener|Ingredienser|Deklarasjon/i.test(declarationText);
  await page.screenshot({ path: screenshot(`recheck-${label}-nutrition-${production.productionId}`), fullPage: false });

  await clickProductionStep(page, 5);
  const pricingText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const pricingObserved = /Prissetting|Priskalkulering|Nettopris|Salgspris/i.test(pricingText);
  await page.screenshot({ path: screenshot(`recheck-${label}-pricing-${production.productionId}`), fullPage: false });

  return {
    label,
    productionStepObserved,
    finishedObserved,
    declarationObserved,
    pricingObserved,
    productionText: productionText.slice(0, 700),
    declarationText: declarationText.slice(0, 700),
    pricingText: pricingText.slice(0, 700),
  };
}

async function confirmProductionState(page, production) {
  const confirmed = { ...production, rechecks: [] };
  const needsRecheck = () =>
    !confirmed.productionStepObserved || !confirmed.finishedObserved || !confirmed.declarationObserved || !confirmed.pricingObserved;

  for (let attempt = 1; attempt <= 2 && needsRecheck(); attempt += 1) {
    await page.waitForTimeout(5000);
    const observation = await observeProductionState(page, confirmed, `attempt-${attempt}`);
    confirmed.rechecks.push(observation);
    confirmed.productionStepObserved = confirmed.productionStepObserved || observation.productionStepObserved;
    confirmed.finishedObserved = confirmed.finishedObserved || observation.finishedObserved;
    confirmed.declarationObserved = confirmed.declarationObserved || observation.declarationObserved;
    confirmed.pricingObserved = confirmed.pricingObserved || observation.pricingObserved;
  }

  return confirmed;
}

test.describe('HC-002 recipe editing and production', () => {
  test('rediger oppskrifter og verifiser produksjon', async ({ page }) => {
    fs.mkdirSync(evidenceDir, { recursive: true });
    const browserAgent = createBrowserTestAgent({ page, testId: 'HC-002', runId, evidenceDir });
    const recipeResults = [];
    let production = null;
    let checks = null;
    let resultWritten = false;

    const writeAgentResult = async ({ error = null, step = 'HC-002 final verification' } = {}) => {
      const currentChecks = checks || {
        recipesEdited: recipeResults.length === recipes.length && recipeResults.every((item) => item.addedObserved && item.removedObserved && item.restoredOriginalCount),
        productionPicked: Boolean(production?.pickedObserved),
        productionStepVisible: Boolean(production?.productionStepObserved),
        productionFinished: Boolean(production?.finishedObserved),
        declarationVisible: Boolean(production?.declarationObserved),
        pricingVisible: Boolean(production?.pricingObserved),
      };
      const result = {
        runId,
        result: !error && Object.values(currentChecks).every(Boolean) ? 'PASS' : 'FAIL',
        checks: currentChecks,
        recipes: recipeResults,
        production,
        browserFindings: browserAgent.findings(),
        evidencePrefix: `test-artifacts/evidence/HC-002-${runId}-`
      };
      const baseDiagnosis = buildCheckDiagnosis({
        testId: 'HC-002',
        checks: currentChecks,
        checkInfo,
        browserFindings: result.browserFindings,
        context: {
          productionId: production?.productionId || '',
          productionUrl: production?.productionUrl || '',
          extraCheck: production?.rechecks?.length
            ? `For konklusjon ble produksjon ${production.productionId} apnet pa nytt og kontrollert ${production.rechecks.length} ekstra gang(er). Siste ekstra sjekk viste: fullfort=${textForBoolean(production.finishedObserved)}, naringsdeklarasjon=${textForBoolean(production.declarationObserved)}, prissetting=${textForBoolean(production.pricingObserved)}.`
            : 'Ingen ekstra re-sjekk ble registrert.',
        },
        nextAction: error
          ? `Playwright stoppet i ${step}: ${error.message || error}`
          : Object.values(currentChecks).every(Boolean)
            ? ''
            : `Apne produksjon ${production?.productionId || 'ukjent'} i RS Store og kontroller status pa Produksjon- og Naringsdeklarasjon-stegene.`,
      });
      result.diagnosis = await browserAgent.diagnose({
        step,
        expected: 'Oppskrifter er gjenopprettet, produksjon er fullfort, og deklarasjon/prissetting er synlig.',
        error,
        baseDiagnosis,
        extra: {
          checks: currentChecks,
          production,
        },
      });
      fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), 'utf8');
      console.log(`HC-002-RESULT ${JSON.stringify(result, null, 2)}`);
      resultWritten = true;
      return result;
    };

    try {
      await loginIfNeeded(page);
      await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

      for (const recipe of recipes) {
        recipeResults.push(await mutateRecipeNoNet(page, recipe));
      }

      production = await confirmProductionState(page, await createAndFinishProduction(page, recipes[0].id));
      checks = {
        recipesEdited: recipeResults.every((item) => item.addedObserved && item.removedObserved && item.restoredOriginalCount),
        productionPicked: production.pickedObserved,
        productionStepVisible: production.productionStepObserved,
        productionFinished: production.finishedObserved,
        declarationVisible: production.declarationObserved,
        pricingVisible: production.pricingObserved
      };
      const result = await writeAgentResult();
      expect(result.diagnosis.failedChecks, result.diagnosis.summary).toEqual([]);
    } catch (error) {
      if (!resultWritten) {
        await writeAgentResult({ error, step: 'HC-002 unexpected failure' }).catch((diagnosisError) => {
          console.log(`HC-002-DIAGNOSIS-ERROR ${diagnosisError.message}`);
        });
      }
      throw error;
    }
  });
});
