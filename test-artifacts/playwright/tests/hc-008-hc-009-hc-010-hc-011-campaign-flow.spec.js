const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { waitForManualAction } = require('../helpers/manual-gate');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.HC_CAMPAIGN_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-008-011-${runId}-${name}.png`);
const resultsPath = path.join(evidenceDir, `HC-008-011-${runId}-results.json`);

const campaignItems = [
  { type: 'kundeavis', article: 'HVETEBOLLE 100G STK', id: '8140' },
  { type: 'kundeavis', article: 'ROSINBOLLE 100G STK', id: '8141' },
  { type: 'mixmatch', article: 'LITAGO MELK SJOKOLADE 0,5L TINE', id: '7038010002625' },
  { type: 'mixmatch', article: 'LITAGO MELK JORDBAER 0,5L TINE', id: '7038010002663' },
];

function campaignItemDetails() {
  return campaignItems.map((item) => `${item.type}: ${item.article} | Vare-ID/GTIN: ${item.id}`);
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stepResult(key, title, status, note = '') {
  return {
    key,
    title,
    status,
    note,
    at: new Date().toISOString(),
  };
}

function campaignCreationMessage() {
  return [
    'Hei, har du mulighet til aa sende over et par kampanjer?',
    'Kjorer bare samme som sist:',
    '(HVETEBOLLE 100G STK/8140 og ROSINBOLLE 100G STK/8141)',
    'og en mixmatch',
    '(LITAGO MELK SJOKOLADE 0,5L TINE/7038010002625 og LITAGO MELK JORDBAER 0,5L TINE/7038010002663)',
    'i RS testmiljo SAP R3T MENY Jessheim?',
  ].join(' ');
}

function campaignChangeMessage(createNote = '') {
  return [
    'Takk, kunne du naa gjort en endring paa disse kampanjene?',
    createNote ? `Referanse fra opprettelsen: ${createNote}` : '',
    'Dette dekker HC-010 endring av sentral kampanje og HC-011 endring av sentral Mixmatch/BonusBuy.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function manualStep({ title, message, details }) {
  return waitForManualAction({
    testId: 'HC-008/009/010/011',
    title,
    message,
    details,
    timeoutMs: 60 * 60 * 1000,
  });
}

async function openCampaignList(page, label) {
  await page.goto('/retailsuite/store/#/campaigns/list/all', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: screenshot(label), fullPage: false });
  const bodyText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  return {
    url: page.url(),
    visible: /Kampanje|Kampanjer|Campaign|Sok|Søk/i.test(bodyText),
    bodyText: bodyText.slice(0, 1200),
  };
}

async function collectCampaignRows(page) {
  return page.evaluate(() => {
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('table tbody tr, .k-grid-content tr, .rs-table-body .rs-table-row, [role="row"]')];
    return rows
      .map((row) => {
        const text = normalizeText(row.innerText);
        const cells = [...row.querySelectorAll('td, .rs-table-cell, [role="gridcell"]')].map((cell) => normalizeText(cell.innerText));
        return { text, cells };
      })
      .filter((row) => row.text && !/NAVN|ID|STATUS|FRA|TIL|HANDLINGER/i.test(row.text));
  });
}

async function searchCampaignReferences(page, references, label) {
  const list = await openCampaignList(page, label);
  const results = [];
  const searchInput = page.locator('input[type="text"], input[placeholder*="Sok" i], input[placeholder*="Søk" i]').first();
  const searchButton = page.locator('button:has-text("Sok"), button:has-text("Søk"), .campaign-search-button').first();

  for (const reference of references) {
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(reference);
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click({ force: true });
      } else {
        await searchInput.press('Enter');
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1800);
    }

    const rows = await collectCampaignRows(page);
    const referenceLower = reference.toLowerCase();
    const matches = rows.filter((row) => row.text.toLowerCase().includes(referenceLower));
    results.push({
      reference,
      found: matches.length > 0,
      matches: matches.slice(0, 5),
    });
  }

  await page.screenshot({ path: screenshot(`${label}-result`), fullPage: false });
  return {
    ...list,
    results,
    foundAny: results.some((result) => result.found),
  };
}

async function manualCampaignFallback({ phase, references, searchResult }) {
  const foundReferences = searchResult.results
    .filter((result) => result.found)
    .map((result) => result.reference)
    .join(', ');
  const missingReferences = searchResult.results
    .filter((result) => !result.found)
    .map((result) => result.reference)
    .slice(0, 10)
    .join(', ');

  return manualStep({
    title: `Kontroller kampanje i RS Store (${phase})`,
    message: 'Playwright fant ikke sikre treff i RS Store. Kontroller kampanjene manuelt for a fortsette.',
    details: [
      `Fase: ${phase}`,
      `Kampanjeoversikt: ${searchResult.url}`,
      foundReferences ? `Treff funnet: ${foundReferences}` : 'Playwright fant ingen sikre treff automatisk.',
      missingReferences ? `Sokt etter: ${missingReferences}` : '',
      'Kontroller at kundeavis og BonusBuy/Mixmatch finnes med riktig innhold i RS Store.',
      'Trykk Gjennomfort hvis RS Store er OK.',
      'Trykk Feilet hvis kampanjen mangler eller innholdet er feil.',
    ].filter(Boolean),
  });
}

function campaignReferences(...notes) {
  const noteText = notes.map(normalize).filter(Boolean).join(' ');
  const explicitReferences = [...noteText.matchAll(/\b\d{4,14}\b/g)].map((match) => match[0]);
  return [...new Set([...explicitReferences, ...campaignItems.map((item) => item.id), 'HVETEBOLLE', 'ROSINBOLLE', 'LITAGO'])];
}

test.describe('HC-008 HC-009 HC-010 HC-011 kampanjeflyt', () => {
  test('opprett og endre kundeavis og BonusBuy i samlet kampanjeflyt', async ({ page }) => {
    test.setTimeout(120 * 60 * 1000);
    fs.mkdirSync(evidenceDir, { recursive: true });
    const steps = [];

    const createMessage = campaignCreationMessage();
    const createAction = await manualStep({
      title: 'Send kampanjeopprettelse',
      message: 'Send meldingen for opprettelse av kundeavis og BonusBuy, og vent til kampanjene er opprettet i SAP.',
      details: [
        'Dekker HC-008 og HC-009.',
        ...campaignItemDetails(),
        'Melding til avsender:',
        createMessage,
        'Skriv kampanje-id, navn eller annen referanse i notatfeltet hvis du far det tilbake.',
        'Trykk Gjennomfort nar kundeavis og BonusBuy er opprettet/sendt fra SAP.',
        'Trykk Feilet hvis opprettelsen ikke kan gjennomfores.',
      ],
    });
    steps.push(stepResult('sap-create-requested', 'Kundeavis og BonusBuy opprettet/sendt fra SAP', 'PASS', createAction.note));

    const createConnector = await manualStep({
      title: 'Verifiser opprettelse i RS Connector',
      message: 'Kontroller at kundeavis-kampanjen og BonusBuy er mottatt i RS Connector.',
      details: [
        'Dekker connector-kontroll for HC-008 og HC-009.',
        ...campaignItemDetails(),
        'Kontroller begge kampanjetypene i connector-flyten.',
        'Skriv kampanje-id/navn i notatfeltet hvis du ser det.',
        'Trykk Gjennomfort hvis begge er mottatt riktig.',
        'Trykk Feilet hvis en av dem mangler eller stopper.',
      ],
    });
    steps.push(stepResult('connector-create-received', 'Opprettelse mottatt i RS Connector', 'PASS', createConnector.note));

    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const createReferences = campaignReferences(createAction.note, createConnector.note);
    const rsStoreCreate = await searchCampaignReferences(page, createReferences, 'campaign-list-after-create');
    const rsStoreCreateFallback = rsStoreCreate.foundAny
      ? null
      : await manualCampaignFallback({ phase: 'opprettelse', references: createReferences, searchResult: rsStoreCreate });
    steps.push(
      stepResult(
        'rs-store-create-verified',
        'Opprettede kampanjer kontrollert i RS Store',
        'PASS',
        rsStoreCreate.results.filter((result) => result.found).map((result) => result.reference).join(', ') ||
          rsStoreCreateFallback?.note ||
          'Manuelt verifisert i RS Store.',
      ),
    );

    const posCreate = await manualStep({
      title: 'Verifiser opprettelse i POS',
      message: 'Kontroller at kundeavis-kampanje og BonusBuy slar inn riktig i POS.',
      details: [
        'Dekker POS-kontroll for HC-008 og HC-009.',
        ...campaignItemDetails(),
        'Trykk Gjennomfort hvis POS bruker kampanje/bonus som forventet.',
        'Trykk Feilet hvis en av kampanjene ikke fungerer.',
      ],
    });
    steps.push(stepResult('pos-create-verified', 'Opprettede kampanjer verifisert i POS', 'PASS', posCreate.note));

    const changeMessage = campaignChangeMessage(createAction.note || createConnector.note);
    const changeAction = await manualStep({
      title: 'Send kampanjeendring',
      message: 'Send melding om endring av kampanjene.',
      details: [
        'Dekker HC-010 og HC-011.',
        ...campaignItemDetails(),
        'Melding til avsender:',
        changeMessage,
        'Skriv ny/endret kampanjereferanse i notatfeltet hvis du far det tilbake.',
        'Trykk Gjennomfort nar endringene er gjort/sendt fra SAP.',
        'Trykk Feilet hvis endringene ikke kan gjennomfores.',
      ],
    });
    steps.push(stepResult('sap-change-requested', 'Kundeavis og BonusBuy endret/sendt fra SAP', 'PASS', changeAction.note));

    const changeConnector = await manualStep({
      title: 'Verifiser endring i RS Connector',
      message: 'Kontroller at endringene for kundeavis-kampanjen og BonusBuy er mottatt i RS Connector.',
      details: [
        'Dekker connector-kontroll for HC-010 og HC-011.',
        ...campaignItemDetails(),
        'Kontroller at begge endringene er mottatt og prosessert.',
        'Trykk Gjennomfort hvis begge endringene er mottatt riktig.',
        'Trykk Feilet hvis en av endringene mangler eller stopper.',
      ],
    });
    steps.push(stepResult('connector-change-received', 'Endring mottatt i RS Connector', 'PASS', changeConnector.note));

    const changeReferences = campaignReferences(createAction.note, createConnector.note, changeAction.note, changeConnector.note);
    const rsStoreChange = await searchCampaignReferences(page, changeReferences, 'campaign-list-after-change');
    const rsStoreChangeFallback = rsStoreChange.foundAny
      ? null
      : await manualCampaignFallback({ phase: 'endring', references: changeReferences, searchResult: rsStoreChange });
    steps.push(
      stepResult(
        'rs-store-change-verified',
        'Endrede kampanjer kontrollert i RS Store',
        'PASS',
        rsStoreChange.results.filter((result) => result.found).map((result) => result.reference).join(', ') ||
          rsStoreChangeFallback?.note ||
          'Manuelt verifisert i RS Store.',
      ),
    );

    const posChange = await manualStep({
      title: 'Verifiser endring i POS',
      message: 'Kontroller at POS reflekterer endret kundeavis-kampanje og endret BonusBuy.',
      details: [
        'Dekker POS-kontroll for HC-010 og HC-011.',
        ...campaignItemDetails(),
        'Trykk Gjennomfort hvis POS viser forventet resultat etter endringene.',
        'Trykk Feilet hvis kundeavis eller BonusBuy ikke reflekterer endringen.',
      ],
    });
    steps.push(stepResult('pos-change-verified', 'Endrede kampanjer verifisert i POS', 'PASS', posChange.note));

    const result = {
      runId,
      result: 'PASS',
      mode: 'hybrid',
      covers: ['HC-008', 'HC-009', 'HC-010', 'HC-011'],
      campaignItems,
      messages: {
        create: createMessage,
        change: changeMessage,
      },
      steps,
      automation: {
        rsStoreCreate,
        rsStoreChange,
      },
      evidencePrefix: `test-artifacts/evidence/HC-008-011-${runId}-`,
      note: 'Samlet hybridtest for kundeavis og BonusBuy: SAP/RS Connector/POS bekreftes via manuelle stoppunkter, RS Store kontrolleres av Playwright.',
    };

    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`HC-008-011-RESULT ${JSON.stringify(result, null, 2)}`);
  });
});
