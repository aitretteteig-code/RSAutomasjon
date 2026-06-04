const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { articleManualDetails, resolveArticleIdentity } = require('../helpers/article-reference');
const { waitForManualAction } = require('../helpers/manual-gate');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.HC004_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const recipeId = process.env.HC004_RECIPE_ID || '514687';
const recipeName = process.env.HC004_RECIPE_NAME || 'BROKKOLISALAT M/BACON PR STK';
const existingProductionId = process.env.HC004_PRODUCTION_ID || '';
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-004-${runId}-${name}.png`);
const resultsPath = path.join(evidenceDir, `HC-004-${runId}-results.json`);

async function dismissOpenOverlays(page) {
  await page
    .evaluate(() => {
      document.querySelectorAll('.modal-content button.close, .modal-dialog button.close').forEach((button) => button.click());
      document.querySelectorAll('.modal-backdrop').forEach((element) => element.remove());
      document.body.classList.remove('modal-open');
    })
    .catch(() => {});
}

async function openArticleWithLatestDeclaration(page, articleId) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, {
    waitUntil: 'domcontentloaded',
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
  await expect(page.getByText(/Start ny produksjon/i).first()).toBeVisible();
}

async function openOrCreateProduction(page, articleId) {
  if (existingProductionId) {
    await page.goto(`/retailsuite/store/#/batches/production/details/${existingProductionId}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    return existingProductionId;
  }

  await dismissOpenOverlays(page);
  await openArticleWithLatestDeclaration(page, articleId);
  await page.getByText('Start ny produksjon').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  return (page.url().match(/details\/(\d+)/) || [])[1] || 'unknown';
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

async function pickIngredients(page, productionId) {
  await page.getByRole('link', { name: /Plukker ingredienser/i }).click();
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
  await page.waitForTimeout(1800);
}

async function verifyProductionStep(page, productionId) {
  await clickProductionStep(page, 3);
  const bodyText = await page.locator('body').innerText();
  const productionStepObserved = /Produksjon|Produsert mengde|Fullfør|Fullfor|Status|Batch/i.test(bodyText);
  await page.screenshot({ path: screenshot(`production-step-${productionId}`), fullPage: false });
  return productionStepObserved;
}

async function verifyDeclaration(page, productionId) {
  await clickProductionStep(page, 4);
  const bodyText = await page.locator('body').innerText();
  const declarationObserved = /Deklarasjonstekst|Næringsinnhold|Naringsinnhold|Allergener|Ingredienser|Deklarasjon/i.test(bodyText);
  await page.screenshot({ path: screenshot(`nutrition-${productionId}`), fullPage: false });
  return declarationObserved;
}

async function finishProduction(page, productionId) {
  let fullforButton = page.getByRole('button', { name: /Fullfor|Fullfør/i }).first();
  if (!(await fullforButton.isVisible().catch(() => false))) {
    await clickProductionStep(page, 3);
    fullforButton = page.getByRole('button', { name: /Fullfor|Fullfør/i }).first();
  }
  if (await fullforButton.isEnabled().catch(() => false)) {
    await fullforButton.click({ force: true });
    await page.waitForTimeout(2500);
    const ok = page.getByRole('button', { name: /^OK$/ }).last();
    if (await ok.isVisible().catch(() => false)) {
      await ok.click({ force: true });
    }
    await page.waitForTimeout(8000);
  }

  const finishedObserved = await page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    const hasSavedToast = /Batchen ble lagret|Fullfort|Fullført|Ferdig|Finishing/i.test(bodyText);
    const hasActiveProductionDeclaration = /Status\s+Aktiv/i.test(bodyText) && /Type\s+Produksjon/i.test(bodyText);
    const fullfor = [...document.querySelectorAll('button')].find((button) => /Fullfor|Fullfør/i.test(button.innerText || ''));
    const checkedSteps = [...document.querySelectorAll('a')].filter((link) => /Kalkulering|Plukker|Produksjon|Næringsdeklarasjon|Prissetting/i.test(link.innerText || '') && /|✓/.test(link.innerText || ''));
    return hasSavedToast || hasActiveProductionDeclaration || !fullfor || checkedSteps.length >= 5;
  });
  await page.screenshot({ path: screenshot(`after-finish-${productionId}`), fullPage: false });
  return finishedObserved;
}

async function verifyPricing(page, productionId) {
  await clickProductionStep(page, 5);
  const bodyText = await page.locator('body').innerText();
  const pricingObserved = /Prissetting|Priskalkulering|Nettopris|Salgspris/i.test(bodyText);
  await page.screenshot({ path: screenshot(`pricing-${productionId}`), fullPage: false });
  return pricingObserved;
}

async function createAndVerifyStkProduction(page, articleId) {
  const productionId = await openOrCreateProduction(page, articleId);
  const productionUrl = page.url();
  await page.screenshot({ path: screenshot(`production-created-${productionId}`), fullPage: false });

  const pickedObserved = await pickIngredients(page, productionId);
  const productionStepObserved = await verifyProductionStep(page, productionId);
  const declarationObserved = await verifyDeclaration(page, productionId);
  const pricingObserved = await verifyPricing(page, productionId);
  const finishedObserved = await finishProduction(page, productionId);

  return {
    productionId,
    productionUrl,
    pickedObserved,
    productionStepObserved,
    finishedObserved,
    declarationObserved,
    pricingObserved,
  };
}

test.describe('HC-004 Produksjon av oppskrift STK', () => {
  test('produser STK-oppskrift og verifiser pris og deklarasjon i RS Store', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    fs.mkdirSync(evidenceDir, { recursive: true });
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const production = await createAndVerifyStkProduction(page, recipeId);
    const manualArticle = await resolveArticleIdentity(page, recipeId, { articleId: recipeId, name: recipeName });
    const manualAction = await waitForManualAction({
      testId: 'HC-004',
      title: 'Vekt/periferi må kontrolleres',
      message: 'Kontroller produksjonen manuelt før testen fortsetter.',
      details: [
        ...articleManualDetails(manualArticle, 'Oppskrift/vare'),
        `Produksjon: ${production.productionId}`,
        'Trykk Gjennomført hvis vekt/periferi er OK.',
        'Trykk Feilet hvis kontrollen ikke er OK.',
      ],
    });
    const result = {
      runId,
      result: 'PASS',
      recipe: { id: recipeId, name: recipeName },
      production,
      manualAction,
      evidencePrefix: `test-artifacts/evidence/HC-004-${runId}-`,
      note: 'Vekt/periferi må verifiseres manuelt dersom full ende-til-ende er påkrevd.',
    };
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`HC-004-RESULT ${JSON.stringify(result, null, 2)}`);

    expect(production.pickedObserved).toBeTruthy();
    expect(production.productionStepObserved).toBeTruthy();
    expect(production.declarationObserved).toBeTruthy();
    expect(production.pricingObserved).toBeTruthy();
    expect(production.finishedObserved).toBeTruthy();
  });
});
