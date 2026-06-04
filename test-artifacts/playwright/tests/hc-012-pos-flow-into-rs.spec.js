const { test, expect } = require('../helpers/agent-test');
const { articleManualDetails, resolveArticleIdentity } = require('../helpers/article-reference');
const { createHybridContext, noteValue, openRsStoreRoute } = require('../helpers/hybrid-flow');

const maxMovementSyncWaitMs = 7 * 60 * 1000;
const movementPollIntervalMs = 60 * 1000;
const stockMovementFallbackRoutes = ['stockmovements/list', 'stock/movements/list', 'stocktransactions/list'];

function parseMovementTime(text, now = new Date()) {
  const value = String(text || '');
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\D{0,30}(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (iso) {
    const [, year, month, day, hour, minute, second = '0'] = iso;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }

  const norwegian = value.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\D{0,30}(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (norwegian) {
    const [, day, month, rawYear, hour, minute, second = '0'] = norwegian;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    return new Date(year, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }

  const timeOnly = value.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (timeOnly) {
    const [, hour, minute, second = '0'] = timeOnly;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hour), Number(minute), Number(second));
  }

  return null;
}

function isToday(timestamp, now = new Date()) {
  return (
    timestamp &&
    !Number.isNaN(timestamp.getTime()) &&
    timestamp.getFullYear() === now.getFullYear() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getDate() === now.getDate()
  );
}

function movementFromRow(row) {
  const cells = row.cells || [];
  const transactionDate = cells[0] || '';
  const typeValue = cells[6] || cells.find((cell) => /^Salg$/i.test(cell)) || '';
  const timestamp = parseMovementTime(transactionDate);
  const saleType = /^Salg$/i.test(String(typeValue || '').trim());
  const today = isToday(timestamp);

  return {
    ...row,
    transactionDate,
    typeValue,
    timestamp: timestamp ? timestamp.toISOString() : '',
    saleType,
    today,
    validSaleMovement: saleType && today,
  };
}

async function readMovementRows(page) {
  return page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rowSelectors = ['table tbody tr', '.k-grid-content tr', '[role="row"]', '.rs-table-row', '.rs-table .row:not(.rs-table-header)'];
    const rows = [...document.querySelectorAll(rowSelectors.join(','))]
      .map((row) => {
        const text = normalize(row.innerText);
        let cellNodes = [...row.querySelectorAll('td, [role="gridcell"], .rs-table-cell')];
        if (!cellNodes.length && row.matches('.rs-table .row')) {
          cellNodes = [...row.children];
        }
        const cells = cellNodes.map((cell) => normalize(cell.innerText || cell.textContent));
        return { text, cells };
      })
      .filter((row) => {
        if (!row.text) return false;
        const looksLikeHeader = /Dato/i.test(row.text) && /Klokke|Tidspunkt|Tid/i.test(row.text) && /Type|Lagerbevegelse|Salg/i.test(row.text);
        return !looksLikeHeader;
      });
    return rows.slice(0, 50);
  });
}

async function clickSearchAndWait(page) {
  const roleSearch = page.getByRole('button', { name: /^S.k$/i }).first();
  const submitSearch = page.locator('button[type="submit"], input[type="submit"]').filter({ hasText: /^S.k$/i }).first();
  const textSearch = page.locator('button, input[type="submit"], .btn').filter({ hasText: /^S.k$/i }).first();
  const searchButton = (await roleSearch.isVisible().catch(() => false))
    ? roleSearch
    : (await submitSearch.isVisible().catch(() => false))
      ? submitSearch
      : textSearch;

  if (await searchButton.isVisible().catch(() => false)) {
    await searchButton.click({ force: true });
  } else {
    await page.keyboard.press('Enter').catch(() => {});
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
}

async function sortMovementsByDateTime(page) {
  const header = page
    .locator('th, [role="columnheader"], .k-header, .rs-table-header-item, .rs-table-header')
    .filter({ hasText: /Transaksjonsdato|Dato|Klokke|Tidspunkt|Tid/i })
    .first();

  if (!(await header.isVisible().catch(() => false))) {
    return { sorted: false, reason: 'Fant ikke dato/tid-kolonne.' };
  }

  await header.click({ force: true });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  let rows = await readMovementRows(page);
  const first = parseMovementTime(rows[0]?.cells?.[0] || rows[0]?.text);
  const second = parseMovementTime(rows[1]?.cells?.[0] || rows[1]?.text);
  if (first && second && first.getTime() < second.getTime()) {
    await header.click({ force: true });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    rows = await readMovementRows(page);
  }

  return { sorted: true, sampleRows: rows.slice(0, 5) };
}

function analyzeMovementRows(rows, movementReference) {
  const candidates = rows
    .map(movementFromRow)
    .filter((row) => row.saleType);

  const validTodaySale = candidates.find((row) => row.validSaleMovement);
  return {
    found: Boolean(validTodaySale),
    validTodaySale,
    candidates: candidates.slice(0, 10),
    newest: rows
      .map(movementFromRow)
      .filter((row) => row.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5),
  };
}

async function clickFirstVisible(locator, action = 'click') {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    await candidate.scrollIntoViewIfNeeded().catch(() => {});
    if (action === 'hover') {
      await candidate.hover({ force: true });
    } else {
      await candidate.click({ force: true });
    }
    return {
      ok: true,
      text: await candidate.innerText().catch(() => ''),
    };
  }
  return { ok: false };
}

async function clickLagerMenu(page) {
  const exactHeaderText = page.locator('header, nav, .navbar, .topbar, .menu').getByText(/^Lager$/i);
  const menuControls = page
    .locator('header, nav, .navbar, .topbar, .menu')
    .locator('a,button,[role="button"],[role="menuitem"],li,span')
    .filter({ hasText: /^Lager$/i });
  const roleLinks = page.getByRole('link', { name: /^Lager$/i });
  const roleButtons = page.getByRole('button', { name: /^Lager$/i });

  for (const locator of [exactHeaderText, menuControls, roleLinks, roleButtons]) {
    const hover = await clickFirstVisible(locator, 'hover');
    if (hover.ok) {
      await page.waitForTimeout(800);
      return hover;
    }
  }

  for (const locator of [exactHeaderText, menuControls, roleLinks, roleButtons]) {
    const click = await clickFirstVisible(locator, 'click');
    if (click.ok) {
      await page.waitForTimeout(800);
      return click;
    }
  }

  return { ok: false };
}

async function clickLagerbevegelser(page) {
  const directStockAdjustmentsLink = page.locator('a[href="#/stockadjustments/list"]').filter({ hasText: /^Lagerbevegelser$/i });
  const directClick = await clickFirstVisible(directStockAdjustmentsLink, 'click');
  if (directClick.ok) {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500);
    return directClick;
  }

  const exactText = page.getByText(/^Lagerbevegelser$/i);
  const menuItem = page
    .locator('a,button,[role="button"],[role="menuitem"]')
    .filter({ hasText: /^Lagerbevegelser$/i });
  const partialLink = page.getByRole('link', { name: /Lagerbevegelser/i });
  const partialButton = page.getByRole('button', { name: /Lagerbevegelser/i });

  for (const locator of [exactText, menuItem, partialLink, partialButton]) {
    const click = await clickFirstVisible(locator, 'click');
    if (click.ok) {
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);
      return click;
    }
  }

  return { ok: false };
}

async function openStockMovements(page, ctx) {
  const home = await openRsStoreRoute(page, ctx, '', 'rs-home-before-stock-movements', /Lager|RetailSuite|Meny|Butikk/i);
  const tried = [{ route: 'home', url: home.url, visible: home.visible }];

  const lagerMenu = await clickLagerMenu(page);
  tried.push({ action: 'open Lager menu', ok: lagerMenu.ok, text: lagerMenu.text || '' });

  if (lagerMenu.ok) {
    const stockMovements = await clickLagerbevegelser(page);
    tried.push({ action: 'click Lagerbevegelser', ok: stockMovements.ok, text: stockMovements.text || '', url: page.url() });

    const bodyText = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
    const visible = /Lagerbevegelse|Lagerbevegelser|Stock movement|Bevegelse|Type|Salg/i.test(bodyText);
    await page.screenshot({ path: ctx.screenshotPath('stock-movements-from-header'), fullPage: false }).catch(() => {});
    if (stockMovements.ok && visible) {
      const result = {
        route: 'Header > Lager > Lagerbevegelser',
        url: page.url(),
        visible,
        bodyText: bodyText.slice(0, 1200),
        tried,
      };
      ctx.addStep('stock-movements-opened', 'Apnet lagerbevegelser via header', 'PASS', result.route, result);
      return result;
    }
  }

  for (const route of stockMovementFallbackRoutes) {
    const pageResult = await openRsStoreRoute(page, ctx, route, `stock-movements-${route.replace(/[^a-z0-9]+/gi, '-')}`, /Lagerbevegelse|Lagerbevegelser|Stock movement|Bevegelse|Type|Salg/i);
    tried.push({ route, url: pageResult.url, visible: pageResult.visible });
    if (pageResult.visible && /Lagerbevegelse|Lagerbevegelser|Stock movement|Bevegelse|Type|Salg/i.test(pageResult.bodyText)) {
      ctx.addStep('stock-movements-opened', 'Apnet lagerbevegelser i RS Store med fallback-rute', 'PASS', route, { tried });
      return { ...pageResult, route, tried };
    }
  }

  const fallback = tried[tried.length - 1] || { route: '', url: page.url(), visible: false };
  ctx.addStep('stock-movements-opened', 'Forsokte a apne lagerbevegelser i RS Store', 'WARN', 'Ingen av kjente ruter ga sikkert treff.', { tried });
  return { ...fallback, tried };
}

async function verifyRecentSaleMovement(page, ctx, movementReference) {
  const startedAt = Date.now();
  const deadline = startedAt + maxMovementSyncWaitMs;
  const attempts = [];
  let sortResult = { sorted: false };
  let attemptNumber = 0;

  while (Date.now() < deadline) {
    attemptNumber += 1;
    if (attemptNumber > 1) {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);
    }
    sortResult = await sortMovementsByDateTime(page);
    await clickSearchAndWait(page);
    const rows = await readMovementRows(page);
    const analysis = analyzeMovementRows(rows, movementReference);
    attempts.push({
      attempt: attemptNumber,
      at: new Date().toISOString(),
      refreshed: attemptNumber > 1,
      rows: rows.length,
      found: analysis.found,
      newest: analysis.newest,
      candidates: analysis.candidates,
    });

    if (analysis.found) {
      await page.screenshot({ path: ctx.screenshotPath('stock-movement-sale-verified'), fullPage: false }).catch(() => {});
      ctx.addStep('stock-movement-sale-auto', 'Automatisk verifisert lagerbevegelse med type Salg i dag', 'PASS', analysis.validTodaySale.transactionDate, {
        sortResult,
        movementReference,
        match: analysis.validTodaySale,
        attempts,
      });
      return { ok: true, sortResult, movementReference, match: analysis.validTodaySale, attempts };
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await page.waitForTimeout(Math.min(movementPollIntervalMs, remaining));
  }

  await page.screenshot({ path: ctx.screenshotPath('stock-movement-sale-not-found'), fullPage: false }).catch(() => {});
  ctx.addStep('stock-movement-sale-auto', 'Automatisk sok etter lagerbevegelse med type Salg', 'WARN', 'Fant ingen lagerbevegelse med type Salg pa dagens dato etter 7 minutter med sjekk hvert minutt.', {
    sortResult,
    movementReference,
    attempts,
  });
  return { ok: false, sortResult, movementReference, attempts };
}

test.describe('HC-012 POS og flyt inn til RS', () => {
  test('verifiser POS-salg i lagerbevegelser i RS Store', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    const ctx = createHybridContext('HC-012', 'HC-012');

    const posSale = await ctx.manualStep({
      key: 'pos-sale',
      title: 'Gjor POS-salg',
      message: 'Gjor ett ordinart salg i POS og ta vare pa kvitteringsnummer, vare eller annen referanse.',
      details: [
        'Testen fortsetter ikke for du har trykket Gjennomfort eller Feilet.',
        'Skriv gjerne kvitteringsnummer, artikkelnummer, GTIN, belop eller vare i notatfeltet.',
        'Forventet: Salget fullfores og kvittering opprettes.',
      ],
    });

    const movementReference =
      noteValue(posSale.note, /(?:kvittering|kvitteringsnummer|receipt)\D*([A-Z0-9-]+)/i) ||
      noteValue(posSale.note, /(?:artikkel|vare|article)\D*([A-Z0-9-]+)/i) ||
      noteValue(posSale.note, /\b([A-Z0-9]{4,})\b/i);

    const movements = await openStockMovements(page, ctx);
    const movementArticle = await resolveArticleIdentity(page, movementReference);
    const movementVerification = await verifyRecentSaleMovement(page, ctx, movementReference);
    if (!movementVerification.ok) {
      await ctx.manualStep({
        key: 'stock-movement-rs-store',
        title: 'Verifiser lagerbevegelse i RS Store',
        message: 'Playwright fant ikke lagerbevegelse med type Salg pa dagens dato. Kontroller RS Store manuelt for a fortsette.',
        details: [
          `RS Store-side apnet av Playwright: ${movements.url}`,
          'Verifiseringen skal skje i Lagerbevegelser, ikke Salg/Kvittering.',
          'Playwright har trykket Sok med en gang, og deretter refreshet RS Store og sjekket pa nytt hvert minutt i opptil 7 minutter.',
          ...articleManualDetails(movementArticle, 'Vare fra POS-salget'),
          movementReference ? `Forsokt referanse: ${movementReference}` : 'Ingen sikker referanse ble oppgitt.',
          'Det er forventet at det kan ta opptil ca. 5 minutter fra POS-salget er gjort til det er synlig i RS.',
          'Krav: Bruk kolonnen TRANSAKSJONSDATO for dato og klokkeslett.',
          'Krav: Raden skal ha type Salg.',
          'Krav: Transaksjonsdato skal vaere dagens dato.',
          'Trykk Gjennomfort hvis lagerbevegelse med type Salg finnes pa dagens dato.',
          'Trykk Feilet hvis lagerbevegelsen mangler, har feil type, eller ikke er pa dagens dato.',
        ],
      });
    }

    const result = ctx.writeResult({
      checks: {
        posSaleCompleted: true,
        stockMovementPageOpened: movements.visible,
        recentSaleMovementVerified: true,
      },
      movementReference,
      movementArticle,
      movementVerification,
    });

    expect(result.result).toBe('PASS');
  });
});
