const fs = require('fs');
const path = require('path');
const { waitForManualAction } = require('./manual-gate');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('./rs-store');

const evidenceDir = path.resolve('test-artifacts/evidence');

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function makeRunId(testId) {
  const envName = `${testId.replace(/[^A-Z0-9]/gi, '').toUpperCase()}_RUN_ID`;
  return process.env[envName] || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}

function createHybridContext(testId, slug = testId) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const runId = makeRunId(testId);
  const steps = [];

  function screenshotPath(name) {
    return path.join(evidenceDir, `${slug}-${runId}-${name}.png`);
  }

  function addStep(key, title, status, note = '', extra = {}) {
    const step = {
      key,
      title,
      status,
      note: normalize(note),
      at: new Date().toISOString(),
      ...extra,
    };
    steps.push(step);
    return step;
  }

  async function manualStep({ key, title, message, details = [], timeoutMs = 60 * 60 * 1000 }) {
    const response = await waitForManualAction({
      testId,
      title,
      message,
      details,
      timeoutMs,
    });
    addStep(key || title.toLowerCase().replace(/[^a-z0-9]+/gi, '-'), title, 'PASS', response.note);
    return response;
  }

  function writeResult(result) {
    const payload = {
      runId,
      testId,
      result: 'PASS',
      steps,
      evidencePrefix: `test-artifacts/evidence/${slug}-${runId}-`,
      ...result,
    };
    const resultsPath = path.join(evidenceDir, `${slug}-${runId}-results.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`${testId}-RESULT ${JSON.stringify(payload, null, 2)}`);
    return payload;
  }

  return {
    testId,
    slug,
    runId,
    steps,
    screenshotPath,
    addStep,
    manualStep,
    writeResult,
  };
}

async function openRsStoreRoute(page, ctx, route, label, expectedPattern) {
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const cleanRoute = String(route || '').replace(/^\/+/, '');
  await page.goto(`/retailsuite/store/#/${cleanRoute}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  const bodyText = normalize(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const visible = expectedPattern ? expectedPattern.test(bodyText) : bodyText.length > 0;
  await page.screenshot({ path: ctx.screenshotPath(label), fullPage: false }).catch(() => {});

  const result = {
    url: page.url(),
    visible,
    bodyText: bodyText.slice(0, 1200),
  };
  ctx.addStep(`rs-${label}`, `Apnet RS Store: ${label}`, visible ? 'PASS' : 'WARN', visible ? '' : 'Siden ble apnet, men forventet tekst ble ikke funnet.', result);
  return result;
}

async function searchPageText(page, ctx, searchText, label) {
  const query = normalize(searchText);
  if (!query) return { searched: false, found: false };

  const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Sok" i], input[placeholder*="Search" i]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(query);
    await searchInput.press('Enter').catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
  }

  const bodyText = normalize(await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''));
  const found = bodyText.toLowerCase().includes(query.toLowerCase());
  await page.screenshot({ path: ctx.screenshotPath(label), fullPage: false }).catch(() => {});
  ctx.addStep(`search-${label}`, `Sokte etter ${query}`, found ? 'PASS' : 'WARN', found ? 'Fant tekst pa siden.' : 'Fant ikke sikkert treff automatisk.');
  return { searched: true, found, query };
}

function noteValue(note, pattern) {
  const match = normalize(note).match(pattern);
  return match ? match[1] || match[0] : '';
}

function getNetworkPath(testPath, stagePath) {
  const environment = normalize(process.env.RS_TEST_ENVIRONMENT || process.env.TEST_ENVIRONMENT || 'test').toLowerCase();
  return environment.includes('stage') ? stagePath : testPath;
}

function inspectNetworkFolder(folderPath, ctx, label) {
  if (!folderPath) return { path: '', accessible: false, files: [], error: 'Path mangler' };
  try {
    const entries = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .map((entry) => entry.name)
      .slice(0, 25);
    const result = { path: folderPath, accessible: true, files: entries };
    ctx.addStep(`path-${label}`, `Sjekket sti: ${label}`, 'PASS', entries.length ? `${entries.length} elementer lest.` : 'Stien er tilgjengelig, men listen er tom.', result);
    return result;
  } catch (error) {
    const result = { path: folderPath, accessible: false, files: [], error: String(error && error.message ? error.message : error) };
    ctx.addStep(`path-${label}`, `Sjekket sti: ${label}`, 'WARN', 'Playwright kunne ikke lese stien automatisk.', result);
    return result;
  }
}

module.exports = {
  createHybridContext,
  getNetworkPath,
  inspectNetworkFolder,
  noteValue,
  normalize,
  openRsStoreRoute,
  searchPageText,
};
