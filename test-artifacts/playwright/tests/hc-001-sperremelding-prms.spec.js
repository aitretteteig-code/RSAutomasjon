const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { waitForManualAction } = require('../helpers/manual-gate');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.HC001_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-001-${runId}-${name}.png`);
const resultsPath = path.join(evidenceDir, `HC-001-${runId}-results.json`);
const fallbackArticles = [
  { articleId: '966897', name: 'ALI FROKOSTKAFFE FILTERMALT 175G', gtin: '7040913336660' },
  { articleId: '626669', name: 'TOMATKETCHUP 570G HEINZ', gtin: '87157239' },
  { articleId: '566071', name: 'HVITLOK&ROSMARIN MARINADE MENY 5KG SOLIN', gtin: '7090049730009' },
  { articleId: '757709', name: 'LAM YTREFILET MARINERT PR KG', gtin: '' },
  { articleId: '514687', name: 'BROKKOLISALAT M/BACON PR STK', gtin: '8962' },
  { articleId: '638939', name: 'APPELSINJUICE M/FRUKTKJOTT 1L SUNNIVA', gtin: '' },
  { articleId: '100724', name: 'PIZZAFYLL TOMAT&URTER 60G TORO', gtin: '' },
  { articleId: '101877', name: 'TUNFISK I OLJE 170G MSC FIRST PRICE', gtin: '' },
  { articleId: '102137', name: 'TOMATER HAKKEDE 390G FIRST PRICE', gtin: '' },
  { articleId: '113086', name: 'LOFBERGS LILA MELLANROST FILTER 450G', gtin: '' },
];

function stepResult(key, title, status, note = '') {
  return {
    key,
    title,
    status,
    note,
    at: new Date().toISOString(),
  };
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function recallReference(...notes) {
  const values = notes.map((note) => normalize(note)).filter(Boolean);
  const idMatch = values.join(' ').match(/\bS\d{4}[-\w]*\b/i);
  if (idMatch) return idMatch[0];
  return values[0] || process.env.HC001_RECALL_REFERENCE || '';
}

function seededIndex(size, seed = runId) {
  if (!size) return 0;
  const numericSeed = String(seed)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return numericSeed % size;
}

function formatArticle(article) {
  if (!article) return 'Ikke funnet';
  return `${article.articleId} - ${article.name}${article.gtin ? `, GTIN/EAN ${article.gtin}` : ''}`;
}

function buildGeirDraft(article) {
  return [
    'Hei Geir,',
    '',
    'Kan du sende en sperremelding fra PRMS til RS Test / Bla / systest for MENY Jessheim?',
    '',
    `Forslag til vare: ${formatArticle(article)}`,
    '',
    'Dette brukes til HC-001 / KOBT-3392, der vi skal verifisere at sperremelding flyter fra PRMS til RS Connector, RS Store og POS.',
    'Gi gjerne beskjed nar meldingen er sendt, og send recall-id/tittel hvis du har det. Etter at vi har verifisert sperren, kommer vi til a be om oppheving for samme vare.',
    '',
    'Takk!',
  ].join('\n');
}

function fallbackArticleSuggestion() {
  const selected = fallbackArticles[seededIndex(fallbackArticles.length)];
  return {
    source: 'fallback-pool',
    candidateCount: fallbackArticles.length,
    ...selected,
  };
}

async function manualStep({ title, message, details }) {
  return waitForManualAction({
    testId: 'HC-001',
    title,
    message,
    details,
    timeoutMs: 45 * 60 * 1000,
  });
}

async function collectArticleRows(page) {
  return page.evaluate(() => {
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('table tbody tr, .rs-table-body .rs-table-row, [role="row"]')];
    return rows
      .map((row) => {
        const text = normalizeText(row.innerText);
        const cells = [...row.querySelectorAll('td, .rs-table-cell, [role="gridcell"]')].map((cell) => normalizeText(cell.innerText));
        const source = cells.length ? cells.join(' ') : text;
        const idMatch = source.match(/\b\d{6}\b/);
        if (!idMatch) return null;
        const afterId = normalizeText(source.slice(source.indexOf(idMatch[0]) + idMatch[0].length));
        const name = normalizeText((cells.find((cell) => cell !== idMatch[0] && /[A-ZÆØÅ]/i.test(cell)) || afterId).replace(/^\W+/, ''));
        const gtinMatch = source.match(/\b\d{8,14}\b/);
        return {
          articleId: idMatch[0],
          name: name || source,
          gtin: gtinMatch && gtinMatch[0] !== idMatch[0] ? gtinMatch[0] : '',
          text,
        };
      })
      .filter((item) => item && item.name && !/VARE-ID|VARENAVN|Søk|Avansert/i.test(item.name));
  });
}

async function suggestArticleForRecall(page) {
  const configured = normalize(process.env.HC001_ARTICLE_SUGGESTION);
  if (configured) {
    const [articleId = '', ...nameParts] = configured.split(/[;,|]/).map((value) => normalize(value));
    return {
      source: 'env',
      articleId,
      name: nameParts.join(' - ') || configured,
      gtin: '',
    };
  }

  await page.goto('/retailsuite/store/#/articles/article/listwithdetails', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  let candidates = await collectArticleRows(page);
  const searchTerms = ['kaffe', 'tomat', 'kylling', 'brod', 'ost', 'salat', 'juice', 'pasta', 'sjokolade', 'egg'];
  const firstTermIndex = seededIndex(searchTerms.length);

  for (let offset = 0; !candidates.length && offset < Math.min(searchTerms.length, 4); offset += 1) {
    const term = searchTerms[(firstTermIndex + offset) % searchTerms.length];
    const input = page.locator('input[placeholder*="ID" i], input[placeholder*="Navn" i], input[type="text"]').first();
    if (!(await input.isVisible().catch(() => false))) break;

    await input.fill(term);
    const searchButton = page.locator('.article-search-button, button:has-text("Sok"), button:has-text("Søk")').first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click({ force: true });
    } else {
      await input.press('Enter');
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    candidates = await collectArticleRows(page);
  }

  const unique = [...new Map(candidates.map((candidate) => [candidate.articleId, candidate])).values()].filter(
    (candidate) => candidate.name.length > 4,
  );
  const selected = unique[seededIndex(unique.length)] || null;
  await page.screenshot({ path: screenshot('article-suggestion'), fullPage: false });

  if (selected) {
    return {
      source: 'rs-store',
      ...selected,
      candidateCount: unique.length,
    };
  }

  return fallbackArticleSuggestion();
}

async function collectRecallRows(page) {
  return page.evaluate(() => {
    const rowSelectors = ['table tbody tr', '.k-grid-content tr', '[role="row"]'];
    const seen = new Set();
    const rows = [];
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    for (const selector of rowSelectors) {
      for (const row of document.querySelectorAll(selector)) {
        if (seen.has(row) || !isVisible(row)) continue;
        seen.add(row);
        const cells = [...row.querySelectorAll('td, [role="gridcell"]')].map((cell) => normalizeText(cell.innerText));
        const text = normalizeText(row.innerText);
        if (!text || /TITTEL\s+TYPE\s+STATUS/i.test(text)) continue;
        rows.push({ text, cells });
      }
    }
    return rows;
  });
}

async function openRecallList(page, label) {
  await page.goto('/retailsuite/store/#/articles/articlerecall/list', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);

  const bodyText = await page.locator('body').innerText({ timeout: 15000 });
  const recallListVisible = /Tilbakekalling|TITTEL|OPPRETTET/i.test(bodyText);
  await page.screenshot({ path: screenshot(label), fullPage: false });

  return {
    recallListVisible,
    title: await page.title().catch(() => ''),
    url: page.url(),
  };
}

async function searchRecallInStore(page, reference, label) {
  const list = await openRecallList(page, label);
  const titleSearch = page.locator('input[placeholder*="Tittel" i], input[type="text"]').first();

  if (reference && (await titleSearch.isVisible().catch(() => false))) {
    await titleSearch.fill(reference);
    await page.getByRole('button', { name: /^Sok$|^Søk$/i }).click({ force: true }).catch(async () => {
      await titleSearch.press('Enter');
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
  }

  const rows = await collectRecallRows(page);
  const normalizedReference = normalize(reference).toLowerCase();
  const matchedRows = normalizedReference ? rows.filter((row) => row.text.toLowerCase().includes(normalizedReference)) : rows;
  const selected = matchedRows[0] || null;

  await page.screenshot({ path: screenshot(`${label}-search-result`), fullPage: false });
  return {
    ...list,
    reference,
    rows,
    matchedRows,
    selected,
    found: Boolean(selected),
  };
}

async function openRecallDetails(page, recallSearch, label) {
  if (!recallSearch.selected) return { opened: false, reason: 'Ingen tilbakekalling funnet i listen.' };

  const selectedText = recallSearch.selected.text;
  const opened = await page.evaluate((text) => {
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('table tbody tr, .k-grid-content tr, [role="row"]')];
    const row = rows.find((candidate) => normalizeText(candidate.innerText) === text);
    if (!row) return false;
    row.scrollIntoView({ block: 'center' });
    const link = row.querySelector('a[href*="articlerecall"], a[ui-sref*="recall"], button, [ng-click]');
    (link || row).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
    (link || row).click();
    return true;
  }, selectedText);

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: screenshot(label), fullPage: false });

  const bodyText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  return {
    opened,
    url: page.url(),
    bodyText: bodyText.slice(0, 1200),
    statusConfirmed: /Tilbakekalt\s*\(Bekreftet\)|Bekreftet|bekreftet/i.test(`${selectedText} ${bodyText}`),
  };
}

async function confirmRecallInStore(page, recallSearch) {
  const details = await openRecallDetails(page, recallSearch, 'recall-details-before-confirm');
  if (details.statusConfirmed) {
    return {
      ...details,
      confirmed: true,
      action: 'already-confirmed',
    };
  }

  const confirmButton = page
    .getByRole('button', { name: /Bekreft|Godkjenn|Lagre|OK/i })
    .first();
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click({ force: true });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const okButton = page.getByRole('button', { name: /^OK$/i }).last();
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click({ force: true });
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: screenshot('recall-details-after-confirm'), fullPage: false });
  const bodyText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const confirmed = /Tilbakekalt\s*\(Bekreftet\)|Bekreftet|bekreftet/i.test(`${recallSearch.selected?.text || ''} ${bodyText}`);
  return {
    ...details,
    confirmed,
    action: confirmed ? 'confirmed-or-observed' : 'confirm-not-observed',
    bodyText: bodyText.slice(0, 1200),
  };
}

async function verifyRecallReleasedInStore(page, reference) {
  const activeSearch = await searchRecallInStore(page, reference, 'recall-list-after-release-active');
  const stillActive = activeSearch.found && !/Opphevet|Frigitt|Avsluttet/i.test(activeSearch.selected?.text || '');

  await openRecallList(page, 'recall-list-after-release-with-lifted');
  const liftedCheckbox = page.locator('label:has-text("Opphevet") input, input[type="checkbox"]').first();
  if (await liftedCheckbox.isVisible().catch(() => false)) {
    await liftedCheckbox.check({ force: true }).catch(async () => liftedCheckbox.click({ force: true }));
  }
  const titleSearch = page.locator('input[placeholder*="Tittel" i], input[type="text"]').first();
  if (reference && (await titleSearch.isVisible().catch(() => false))) {
    await titleSearch.fill(reference);
  }
  await page.getByRole('button', { name: /^Sok$|^Søk$/i }).click({ force: true }).catch(async () => {
    await titleSearch.press('Enter').catch(() => {});
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: screenshot('recall-list-after-release-with-lifted-result'), fullPage: false });

  const liftedRows = await collectRecallRows(page);
  const referenceLower = normalize(reference).toLowerCase();
  const liftedMatch = referenceLower ? liftedRows.find((row) => row.text.toLowerCase().includes(referenceLower)) : liftedRows[0];

  return {
    reference,
    stillActive,
    activeSearch,
    liftedFound: Boolean(liftedMatch),
    liftedMatch,
    released: !stillActive || /Opphevet|Frigitt|Avsluttet/i.test(liftedMatch?.text || ''),
  };
}

test.describe('HC-001 Sperremelding PRMS', () => {
  test('kjor delvis manuell sperremelding fra PRMS til POS', async ({ page }) => {
    test.setTimeout(90 * 60 * 1000);
    fs.mkdirSync(evidenceDir, { recursive: true });
    const steps = [];

    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const suggestedArticle = await suggestArticleForRecall(page);
    const geirDraft = buildGeirDraft(suggestedArticle);
    steps.push(
      stepResult(
        'article-suggested',
        'Vareforslag generert',
        suggestedArticle.articleId ? 'PASS' : 'FAIL',
        `${formatArticle(suggestedArticle)} (${suggestedArticle.source})`,
      ),
    );
    expect(suggestedArticle.articleId, 'Playwright fant ikke en vare a foresla for sperremelding i RS Store.').toBeTruthy();

    const prmsOrder = await manualStep({
      title: 'Bestill sperremelding i PRMS',
      message: 'Send melding til Geir og vent til sperremelding er bestilt/sendt fra PRMS.',
      details: [
        `Foreslatt vare: ${formatArticle(suggestedArticle)}`,
        'Utkast til melding:',
        geirDraft,
        'Skriv recall-id/tittel i notatfeltet hvis Geir svarer med det.',
        'Trykk Gjennomfort nar PRMS har sendt sperremeldingen.',
        'Trykk Feilet hvis meldingen ikke kan bestilles eller sendes.',
      ],
    });
    steps.push(stepResult('prms-block-requested', 'Sperremelding bestilt i PRMS', 'PASS', prmsOrder.note));

    const connectorReceived = await manualStep({
      title: 'Verifiser RS Connector',
      message: 'Kontroller at sperremeldingen er mottatt i RS Connector.',
      details: [
        `Vare: ${formatArticle(suggestedArticle)}`,
        'Sjekk connector-flyten for sperremeldingen som ble sendt fra PRMS.',
        'Skriv recall-id, tittel eller vare i notatfeltet. Playwright bruker dette til a finne riktig sperremelding i RS Store.',
        'Trykk Gjennomfort hvis meldingen er mottatt riktig.',
        'Trykk Feilet hvis meldingen mangler, har feil butikk/vare, eller stopper i connector.',
      ],
    });
    steps.push(stepResult('rs-connector-block-received', 'Sperremelding mottatt i RS Connector', 'PASS', connectorReceived.note));

    const reference = recallReference(connectorReceived.note, prmsOrder.note, suggestedArticle.articleId, suggestedArticle.name);
    expect(
      reference,
      'Skriv recall-id, tittel eller vare i notatfeltet pa PRMS- eller Connector-steget, slik at Playwright kan finne riktig sperremelding i RS Store.',
    ).toBeTruthy();

    const recallSearch = await searchRecallInStore(page, reference, 'recall-list-after-connector');
    steps.push(
      stepResult(
        'rs-store-recall-found',
        'Sperremelding funnet i RS Store',
        recallSearch.found ? 'PASS' : 'FAIL',
        recallSearch.selected?.text || `Ingen treff for ${reference}`,
      ),
    );
    expect(recallSearch.found, `Fant ikke sperremelding i RS Store for "${reference}".`).toBeTruthy();

    const storeConfirmation = await confirmRecallInStore(page, recallSearch);
    steps.push(
      stepResult(
        'rs-store-block-confirmed',
        'Sperremelding bekreftet i RS Store',
        storeConfirmation.confirmed ? 'PASS' : 'FAIL',
        storeConfirmation.action,
      ),
    );
    expect(storeConfirmation.confirmed, 'Playwright kunne ikke verifisere at sperremeldingen ble bekreftet i RS Store.').toBeTruthy();

    const posBlocked = await manualStep({
      title: 'Verifiser sperre i POS',
      message: 'Testen venter pa POS-kontroll av sperret vare.',
      details: [
        `Vare som skal skannes: ${formatArticle(suggestedArticle)}`,
        'Forsok a selge/skanne varen i POS.',
        'Trykk Gjennomfort hvis POS stopper salget fordi varen er sperret.',
        'Trykk Feilet hvis varen fortsatt kan selges.',
      ],
    });
    steps.push(stepResult('pos-blocked', 'Varen er sperret i POS', 'PASS', posBlocked.note));

    const prmsRelease = await manualStep({
      title: 'Be om oppheving i PRMS',
      message: 'Testen venter pa at sperren oppheves fra PRMS/prosess.',
      details: [
        `Vare: ${formatArticle(suggestedArticle)}`,
        'Be om oppheving/frigivelse av samme sperremelding.',
        'Trykk Gjennomfort nar opphevingsmeldingen er sendt.',
        'Trykk Feilet hvis oppheving ikke kan sendes.',
      ],
    });
    steps.push(stepResult('prms-release-requested', 'Oppheving sendt fra PRMS', 'PASS', prmsRelease.note));

    const connectorReleased = await manualStep({
      title: 'Verifiser oppheving i RS Connector',
      message: 'Kontroller at opphevingsmeldingen er mottatt i RS Connector.',
      details: [
        `Vare: ${formatArticle(suggestedArticle)}`,
        'Sjekk at opphevingen for samme vare/sperremelding er mottatt.',
        'Trykk Gjennomfort hvis connector viser korrekt oppheving.',
        'Trykk Feilet hvis opphevingen mangler eller stopper.',
      ],
    });
    steps.push(stepResult('rs-connector-release-received', 'Oppheving mottatt i RS Connector', 'PASS', connectorReleased.note));

    const storeRelease = await verifyRecallReleasedInStore(page, reference);
    steps.push(
      stepResult(
        'rs-store-release-confirmed',
        'Oppheving verifisert i RS Store',
        storeRelease.released ? 'PASS' : 'FAIL',
        storeRelease.liftedMatch?.text || storeRelease.activeSearch.selected?.text || `Ingen opphevet treff for ${reference}`,
      ),
    );
    expect(storeRelease.released, 'Playwright kunne ikke verifisere at sperren er opphevet i RS Store.').toBeTruthy();

    const posReleased = await manualStep({
      title: 'Verifiser salg i POS',
      message: 'Siste steg: kontroller at varen kan selges igjen i POS.',
      details: [
        `Vare som skal skannes: ${formatArticle(suggestedArticle)}`,
        'Forsok a selge/skanne varen i POS etter oppheving.',
        'Trykk Gjennomfort hvis salget kan gjennomfores.',
        'Trykk Feilet hvis POS fortsatt stopper varen.',
      ],
    });
    steps.push(stepResult('pos-released', 'Varen kan selges i POS', 'PASS', posReleased.note));

    const result = {
      runId,
      result: 'PASS',
      mode: 'hybrid',
      steps,
      automation: {
        suggestedArticle,
        geirDraft,
        recallReference: reference,
        rsStoreRecallSearch: recallSearch,
        rsStoreConfirmation: storeConfirmation,
        rsStoreRelease: storeRelease,
      },
      evidencePrefix: `test-artifacts/evidence/HC-001-${runId}-`,
      note: 'HC-001 er en delvis manuell ende-til-ende-test. PRMS, RS Connector og POS bekreftes via portalens manuelle stoppunkter. RS Store verifiseres av Playwright.',
    };

    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`HC-001-RESULT ${JSON.stringify(result, null, 2)}`);
  });
});
