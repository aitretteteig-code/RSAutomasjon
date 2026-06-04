const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../test-artifacts/playwright/helpers/rs-store');

const RS_BASE_URL = process.env.RS_STORE_URL || 'https://rsbutikk-blue.test.ngdata.no/retailsuite/store/';
const STORE_NAME = process.env.RS_STORE_NAME || DEFAULT_STORE_NAME;
const ORDER_NUMBER = process.env.HC006_ORDER_NUMBER || '';
const CUSTOMER_NAME = process.env.HC006_CUSTOMER_NAME || 'Emilie';
const EXPECTED_AMOUNT = process.env.HC006_EXPECTED_AMOUNT || '';
const KEEP_BROWSER_OPEN = process.env.HC006_KEEP_BROWSER_OPEN === '1';
const profileDir = path.resolve('test-artifacts/.browser-profiles/rs-store-edge');
const resultPath = path.resolve('test-artifacts/evidence/HC-006-rs-verification.json');
const screenshotPath = path.resolve('test-artifacts/evidence/HC-006-rs-pickcollect.png');

function writeResult(result) {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2), 'utf8');
}

function sanitize(text) {
  return (text || '').replace(/\b\d{4,}\b/g, '[number]').replace(/\s+/g, ' ').slice(0, 3000);
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
}

async function waitForRsLogin(page) {
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const text = await bodyText(page);
    if (!/Please login|Username|Password|Login with NorgesGruppen/i.test(text)) return;

    const username = process.env.RS_TEST_USERNAME;
    const password = process.env.RS_TEST_PASSWORD;
    const passwordInput = page.locator('input[type="password"]').first();
    if (username && password && (await passwordInput.isVisible().catch(() => false))) {
      const usernameInput = page
        .locator('input[name="Username"], input[name="username"], input[type="email"], input[type="text"]')
        .filter({ hasNot: page.locator('[type="hidden"]') })
        .first();
      await usernameInput.fill(username);
      await passwordInput.fill(password);
      await page.locator('#login-btn, button[type="submit"], input[type="submit"]').first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      continue;
    }

    writeResult({
      status: 'WAITING_FOR_MANUAL_RS_LOGIN',
      url: page.url(),
      note: 'RS login is required in the visible browser. The script will continue after login.',
    });
    await page.waitForTimeout(3000);
  }
  throw new Error('Timed out waiting for manual RS login.');
}

async function confirmStoreIfNeeded(page) {
  const text = await bodyText(page);
  if (!/Velg butikk/i.test(text)) return;

  await page.evaluate((storeName) => {
    for (const select of document.querySelectorAll('select')) {
      const option = [...select.options].find((opt) => opt.textContent.trim() === storeName);
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const confirm = [...document.querySelectorAll('button,input[type="submit"],a')]
      .find((el) => ((el.innerText || el.value || '').trim()) === 'Bekreft');
    if (confirm) confirm.click();
  }, STORE_NAME);

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
}

async function openRoute(page, route) {
  const url = `${RS_BASE_URL.replace(/\/$/, '')}/#/${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(4000);
}

async function applyOrderSearch(page) {
  if (!ORDER_NUMBER) return false;

  const visibleInputs = async () => page
    .locator('input[type="search"], input[placeholder*="Søk" i], input[aria-label*="Søk" i], input[type="text"]')
    .evaluateAll((inputs) => inputs
      .map((input, index) => {
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        return {
          index,
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          disabled: input.disabled || input.getAttribute('aria-disabled') === 'true',
        };
      })
      .filter((input) => input.visible && !input.disabled))
    .catch(() => []);

  let inputs = await visibleInputs();
  if (!inputs.length) {
    const searchButton = page.getByRole('button', { name: /^søk$/i }).first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
      await page.waitForTimeout(1000);
      inputs = await visibleInputs();
    }
  }

  const input = inputs[0];
  if (!input) return false;

  const locator = page
    .locator('input[type="search"], input[placeholder*="Søk" i], input[aria-label*="Søk" i], input[type="text"]')
    .nth(input.index);
  await locator.fill(ORDER_NUMBER);
  await locator.press('Enter').catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  return true;
}

function hasExpectedOrder(text) {
  const normalized = text.toLowerCase();
  const hasOrderNumber = ORDER_NUMBER && normalized.includes(ORDER_NUMBER.toLowerCase());
  if (ORDER_NUMBER) return hasOrderNumber;
  const hasCustomer = CUSTOMER_NAME && normalized.includes(CUSTOMER_NAME.toLowerCase());
  const hasAmount = EXPECTED_AMOUNT && normalized.includes(EXPECTED_AMOUNT.toLowerCase());
  return hasCustomer || hasAmount;
}

(async () => {
  fs.mkdirSync(profileDir, { recursive: true });
  writeResult({ status: 'STARTED', note: 'Opening RS Pick&Collect verification.' });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  const routes = [
    { route: 'pickAndCollect/ordersToPick', label: 'Ordre til plukk' },
    { route: 'pickAndCollect/ordersInProgress', label: 'Plukk startet' },
    { route: 'pickAndCollect/ordersToCollect', label: 'Ordre til henting' },
    { route: 'pickAndCollect/futureOrders', label: 'Fremtidige bestillinger' },
    { route: 'pickAndCollect/ordersArchive', label: 'Ordrearkiv' },
  ];

  await openRoute(page, routes[0].route);
  await loginIfNeeded(page);
  await ensureStoreSelected(page, STORE_NAME);

  const findings = [];
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    for (const target of routes) {
      await openRoute(page, target.route);
      await confirmStoreIfNeeded(page);
      const searchApplied = await applyOrderSearch(page);
      const text = await bodyText(page);
      const found = hasExpectedOrder(text);
      findings.push({
        label: target.label,
        route: target.route,
        url: page.url(),
        searchApplied,
        found,
        bodyText: sanitize(text),
      });

      if (found) {
        await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
        writeResult({
          status: 'PASS',
          store: STORE_NAME,
          matchedRoute: target.route,
          matchedRouteLabel: target.label,
          screenshot: 'test-artifacts/evidence/HC-006-rs-pickcollect.png',
          findings,
        });
        if (KEEP_BROWSER_OPEN) await new Promise(() => {});
        await context.close();
        return;
      }
    }

    writeResult({
      status: 'WAITING_FOR_ORDER_IN_RS',
      store: STORE_NAME,
      note: 'Order not visible yet in checked Pick&Collect routes; waiting and retrying.',
      findings: findings.slice(-routes.length),
    });
    await page.waitForTimeout(30000);
  }

  writeResult({
    status: 'BLOCKED',
    store: STORE_NAME,
    note: 'Order was not found in RS Pick&Collect within the wait window.',
    findings: findings.slice(-routes.length),
  });
  if (KEEP_BROWSER_OPEN) await new Promise(() => {});
  await context.close();
})().catch((error) => {
  writeResult({ status: 'ERROR', error: error.message });
  console.error(error);
  process.exit(1);
});
