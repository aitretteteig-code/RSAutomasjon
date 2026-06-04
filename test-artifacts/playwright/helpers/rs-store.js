const { expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const path = require('path');

const DEFAULT_STORE_URL = 'https://rsbutikk-blue.test.ngdata.no/retailsuite/store/';
const DEFAULT_STORE_NAME = 'MENY JESSHEIM';
let secureCredentialsCache = null;

function readSecureCredentials() {
  if (secureCredentialsCache) return secureCredentialsCache;

  const scriptPath = path.resolve('scripts/secure-rs-credentials.ps1');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', 'Get'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    secureCredentialsCache = {};
    return secureCredentialsCache;
  }

  try {
    secureCredentialsCache = JSON.parse(result.stdout);
  } catch {
    secureCredentialsCache = {};
  }
  return secureCredentialsCache;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (value && value.trim()) {
    return value;
  }

  const secureCredentials = readSecureCredentials();
  const secureValue = name === 'RS_TEST_USERNAME'
    ? secureCredentials.username
    : name === 'RS_TEST_PASSWORD'
      ? secureCredentials.password
      : '';

  if (secureValue && String(secureValue).trim()) {
    return String(secureValue);
  }

  throw new Error(
    `Missing required environment variable: ${name}. Set it directly or save encrypted local credentials with scripts/secure-rs-credentials.ps1.`,
  );
}

async function loginIfNeeded(page) {
  const username = getRequiredEnv('RS_TEST_USERNAME');
  const password = getRequiredEnv('RS_TEST_PASSWORD');
  const startUrl = process.env.RS_LOGIN_URL || process.env.RS_STORE_URL || DEFAULT_STORE_URL;

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  const passwordInput = page.locator('input[type="password"]').first();
  if (await passwordInput.isVisible().catch(() => false)) {
    const usernameInput = page
      .locator('input[name="Username"], input[name="username"], input[type="email"], input[type="text"]')
      .filter({ hasNot: page.locator('[type="hidden"]') })
      .first();

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await page.locator('#login-btn, button[type="submit"], input[type="submit"]').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await confirmStoreSelectionGate(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
}

async function confirmStoreSelectionGate(page, storeName = DEFAULT_STORE_NAME) {
  const bodyText = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
  if (!bodyText.includes('Velg butikk')) return false;

  if (bodyText.includes('Brukeren har ikke tilgang til noen butikker')) {
    throw new Error(
      `Login succeeded, but RS Store returned no accessible stores in the isolated Playwright profile. Expected store: ${storeName}`
    );
  }

  const result = await page.evaluate((selectedStoreName) => {
      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };

      for (const select of document.querySelectorAll('select')) {
        const option = [...select.options].find((opt) => opt.textContent.trim() === selectedStoreName);
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      const controls = [...document.querySelectorAll('button,input[type="submit"],a')];
      const confirm = controls.find((el) => isVisible(el) && (el.innerText || el.value || '').trim() === 'Bekreft');
      if (!confirm) return { ok: false, reason: 'Visible Bekreft control not found' };
      confirm.click();
      return { ok: true };
    }, storeName);

  if (!result.ok) {
    throw new Error(`Could not confirm store selection: ${JSON.stringify(result)}`);
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  return true;
}

async function getAngularStoreContext(page) {
  return page.evaluate(() => {
    try {
      const angularRef = window.angular;
      const body = document.body;
      if (!angularRef || !body) return { available: false };
      const injector = angularRef.element(body).injector();
      if (!injector) return { available: false };
      const auth = injector.get('auth');
      const user = (auth && auth.user) || {};
      return {
        available: true,
        isLoggedIn: !!(auth.isLoggedIn && auth.isLoggedIn()),
        isStoreSelected: !!(auth.isStoreSelected && auth.isStoreSelected()),
        selectedStoreId: user.selectedStoreId || null,
        selectedStoreName: user.selectedStoreName || null
      };
    } catch (error) {
      return { available: false, error: String(error && error.message ? error.message : error) };
    }
  });
}

async function selectStoreFromUserMenu(page, storeName = DEFAULT_STORE_NAME) {
  const userMenu = page.locator('.user-dropdown-toggle').last();
  await expect(userMenu).toBeVisible();
  await userMenu.click();

  const storeChoice = page.getByText(storeName, { exact: true }).last();
  await expect(storeChoice).toBeVisible();
  await storeChoice.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
}

async function ensureStoreSelected(page, storeName = DEFAULT_STORE_NAME) {
  const bodyText = await page.locator('body').innerText({ timeout: 15000 });
  if (bodyText.includes('Velg butikk')) {
    await confirmStoreSelectionGate(page, storeName);
  }

  const updatedBodyText = await page.locator('body').innerText({ timeout: 15000 });
  if (updatedBodyText.includes('Brukeren har ikke tilgang til noen butikker')) {
    throw new Error(
      `Login succeeded, but RS Store returned no accessible stores in the isolated Playwright profile. Expected store: ${storeName}`
    );
  }

  let context = await getAngularStoreContext(page);
  if (!updatedBodyText.includes(storeName) || !context.available || !context.isStoreSelected || context.selectedStoreName !== storeName) {
    await selectStoreFromUserMenu(page, storeName);
    context = await getAngularStoreContext(page);
  }

  expect(context.available, `Angular/auth context should be available: ${JSON.stringify(context)}`).toBeTruthy();
  expect(context.isLoggedIn, `User should be logged in: ${JSON.stringify(context)}`).toBeTruthy();
  expect(context.isStoreSelected, `Store should be internally selected: ${JSON.stringify(context)}`).toBeTruthy();
  expect(context.selectedStoreName).toBe(storeName);

  return context;
}

module.exports = {
  DEFAULT_STORE_NAME,
  DEFAULT_STORE_URL,
  ensureStoreSelected,
  getAngularStoreContext,
  loginIfNeeded
};
