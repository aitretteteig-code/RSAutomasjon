const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { clickAgentControl } = require('../helpers/agent-actions');
const { DEFAULT_MENY_PREPROD_URL, getMenyValue, getRequiredMenyValue } = require('../helpers/meny-preprod');
const { DEFAULT_STORE_NAME: RS_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.HC006_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence');
const screenshot = (name) => path.join(evidenceDir, `HC-006-${runId}-${name}.png`);
const resultsPath = path.join(evidenceDir, `HC-006-${runId}-results.json`);

const MENY_PREPROD_URL = getMenyValue('MENY_PREPROD_URL', DEFAULT_MENY_PREPROD_URL);
const MENY_HOST = new URL(MENY_PREPROD_URL).hostname;
const DEFAULT_PICKUP_STORE = process.env.MENY_PICKUP_STORE || 'MENY Jessheim';
const DEFAULT_PRODUCT_SEARCH = process.env.MENY_PRODUCT_SEARCH || 'banan';
const ALLOW_PLACE_ORDER = process.env.MENY_ALLOW_PLACE_ORDER !== '0';
const VERIFY_RS_PICKCOLLECT = process.env.HC006_VERIFY_RS_PICKCOLLECT !== '0';
const COMPLETE_RS_PICKCOLLECT_ORDER = process.env.HC006_COMPLETE_RS_PICKCOLLECT_ORDER !== '0';
const RS_BASE_URL = process.env.RS_STORE_URL || 'https://rsbutikk-blue.test.ngdata.no/retailsuite/store/';
const ORDER_CONFIRMATION_TIMEOUT_MS = Number(process.env.HC006_ORDER_CONFIRMATION_TIMEOUT_MS || 10 * 60 * 1000);

function isMenyPage(page) {
  try {
    return new URL(page.url()).hostname === MENY_HOST;
  } catch {
    return false;
  }
}

async function activePage(context) {
  const pages = context.pages();
  return pages[pages.length - 1];
}

async function safeScreenshot(page, name) {
  await page.screenshot({ path: screenshot(name), fullPage: false }).catch(() => {});
}

async function waitForSettled(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function clickFirstVisible(locator, label, timeout = 15000) {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout });
      return true;
    }
  }
  throw new Error(`Could not find visible control: ${label}`);
}

async function fillFirstVisible(locator, value, label, timeout = 15000) {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.fill(value, { timeout });
      return true;
    }
  }
  throw new Error(`Could not find visible input: ${label}`);
}

async function openMeny(page) {
  await page.goto(MENY_PREPROD_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/MENY/i);
  await safeScreenshot(page, 'meny-opened');
}

async function loginToMeny(page, context) {
  const phone = getRequiredMenyValue('MENY_TEST_PHONE');
  const password = getRequiredMenyValue('MENY_TEST_PASSWORD');
  const otpCode = getMenyValue('MENY_TEST_OTP_CODE');

  await openMeny(page);
  await clickFirstVisible(page.getByTestId('LoginButton'), 'header login');
  await clickAgentControl(page, {
    label: 'continue with Trumf',
    names: ['Fortsett med Trumf', 'Logg inn med Trumf', 'Trumf'],
  });
  await waitForSettled(page);

  page = await activePage(context);
  if (!isMenyPage(page)) {
    await fillFirstVisible(page.locator('input[type="tel"], input'), phone, 'Trumf phone');
    await clickAgentControl(page, { label: 'submit phone', names: ['Fortsett', 'Neste', 'Logg inn'] });
    await waitForSettled(page);
    page = await activePage(context);
  }

  if (!isMenyPage(page)) {
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill(password);
      await clickAgentControl(page, { label: 'submit password', names: ['Fortsett', 'Logg inn', 'Neste'] });
      await waitForSettled(page);
      page = await activePage(context);
    }
  }

  if (!isMenyPage(page)) {
      const otpInput = page.locator('#one-time-code');
    if (await otpInput.isVisible().catch(() => false)) {
      if (!otpCode) {
        throw new Error('Trumf login requested SMS code. Set MENY_TEST_OTP_CODE or save it encrypted for this run.');
      }
      await otpInput.fill(otpCode);
      await safeScreenshot(page, 'otp-filled');
      await page.keyboard.press('Enter').catch(() => {});
      await waitForSettled(page, 45000);
      page = await activePage(context);
    }
  }

  await expect.poll(() => isMenyPage(page), { timeout: 45000 }).toBeTruthy();
  await expect(page.locator('body')).toContainText(/Hei,/i, { timeout: 20000 });
  await safeScreenshot(page, 'login-verified');
  return page;
}

async function clearCart(page) {
  await page.goto(new URL('/kassen', MENY_PREPROD_URL).toString(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);
  await safeScreenshot(page, 'cart-before-cleanup');

  const removeAll = page.getByText(/^Fjern alle$/i).first();
  if (await removeAll.isVisible().catch(() => false)) {
    await removeAll.click();
    await page.waitForTimeout(800);
    const confirm = page.getByRole('button', { name: /fjern alle|tøm|bekreft|ja/i });
    if (await confirm.first().isVisible().catch(() => false)) {
      await confirm.first().click();
      await waitForSettled(page);
    }
  }

  const emptyCart = page.getByRole('button', { name: /tøm handlevognen|tøm/i }).first();
  if (await emptyCart.isVisible().catch(() => false)) {
    await emptyCart.click();
    await waitForSettled(page);
  }

  const removeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^Fjern$/i }) }).first();
  if (await removeSelect.isVisible().catch(() => false)) {
    await removeSelect.selectOption({ label: 'Fjern' });
    await waitForSettled(page);
    const confirm = page.getByRole('button', { name: /fjern|bekreft|ja/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await waitForSettled(page);
    }
  }

  await safeScreenshot(page, 'cart-after-cleanup');
}

async function searchForProduct(page) {
  await page.goto(MENY_PREPROD_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);

  const searchInput = page.locator('header input, input[type="search"], input[placeholder*="lurer" i]').first();
  await searchInput.fill(DEFAULT_PRODUCT_SEARCH);
  await page.keyboard.press('Enter');
  await waitForSettled(page);
  await safeScreenshot(page, 'product-search');
}

async function addFirstAvailableProduct(page) {
  const addButtons = page.getByRole('button', { name: /legg .+ i handlevognen/i });
  await expect(addButtons.first(), 'at least one product add button should be visible').toBeVisible({ timeout: 30000 });
  const count = await addButtons.count();
  for (let index = 0; index < count; index += 1) {
    const button = addButtons.nth(index);
    if (await button.isVisible().catch(() => false)) {
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.waitForTimeout(1500);
      await handleExistingOrderDialog(page);
      await expect(page.locator('body')).toContainText(/vare i handlevognen/i, { timeout: 15000 });
      await safeScreenshot(page, 'item-added');
      return;
    }
  }
  throw new Error(`No visible add-to-cart button found after searching for ${DEFAULT_PRODUCT_SEARCH}.`);
}

async function handleExistingOrderDialog(page) {
  const editOrderDialog = page.locator('dialog.ngr-modal--edit-order[open]').first();
  if (!(await editOrderDialog.isVisible().catch(() => false))) return false;

  await clickAgentControl(editOrderDialog, {
    label: 'start new order',
    names: ['Start ny bestilling', 'Ny bestilling', 'Start på nytt'],
  });
  await waitForSettled(page);
  await expect(editOrderDialog).toBeHidden({ timeout: 15000 });
  return true;
}

async function openCheckout(page) {
  await handleExistingOrderDialog(page);
  await clickFirstVisible(page.locator('button.ws-cart-button'), 'cart button');
  await page.waitForTimeout(1200);
  await clickFirstVisible(page.getByRole('button', { name: /til kassen|gå til kassen|kasse/i }), 'checkout button');
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Kassen/i);
  await safeScreenshot(page, 'checkout-step-1');
}

async function continueToCheckoutStep2(page) {
  await clickFirstVisible(page.getByRole('button', { name: /^Neste$/i }), 'checkout next');
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Leverings- og betalingsinformasjon|Dato og tid/i);
  await safeScreenshot(page, 'checkout-step-2');
}

async function openCheckoutWithAgent(page) {
  await handleExistingOrderDialog(page);
  await clickFirstVisible(page.locator('button.ws-cart-button'), 'cart button');
  await page.waitForTimeout(1200);
  await clickAgentControl(page, {
    label: 'checkout button',
    names: ['Til kassen', 'Gå til kassen', 'Kasse'],
  });
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Kassen/i);
  await safeScreenshot(page, 'checkout-step-1');
}

async function continueToCheckoutStep2WithAgent(page) {
  await clickAgentControl(page, { label: 'checkout next', names: ['Neste', 'Fortsett'] });
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Leverings- og betalingsinformasjon|Dato og tid/i);
  await safeScreenshot(page, 'checkout-step-2');
}

async function chooseFirstPickupSlot(page) {
  const dateButton = page.getByRole('button', { name: /velg dato og tid|dato og tid|ikke valgt|endre dato og tid/i }).first();
  if (await dateButton.isVisible().catch(() => false)) {
    await dateButton.click();
    await page.waitForTimeout(1000);
  }

  const availableSlot = page
    .locator('button.ws-handover-time-radio-button:not(.ngr-button--disabled)')
    .filter({ hasText: /\d+\s*kr/i })
    .first();
  await expect(availableSlot, 'first available pickup slot should be visible').toBeVisible({ timeout: 15000 });
  const slotTitle = (await availableSlot.getAttribute('title')) || (await availableSlot.innerText());
  await availableSlot.click();
  await page.waitForTimeout(800);

  const handoverDialog = page.locator('dialog.ngr-modal--handover-picker[open]').last();
  const confirmScope = (await handoverDialog.isVisible({ timeout: 3000 }).catch(() => false)) ? handoverDialog : page;
  const confirm = confirmScope
    .getByRole('button', { name: /behold henting|bekreft henting|bekreft|velg|oppdater|ferdig/i })
    .filter({ hasNotText: /endre|leveringsalternativ|leveringstid/i })
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm).toBeEnabled({ timeout: 10000 });
    await confirm.click();
    await waitForSettled(page);
  } else {
    await waitForSettled(page);
  }
  await expect(page.locator('body')).toContainText(/Du har valgt å hente|Kl\./i);
  await safeScreenshot(page, 'pickup-confirmed');
  return slotTitle;
}

async function chooseFirstPickupSlotWithAgent(page) {
  const dateButton = page.getByRole('button', { name: /velg dato og tid|dato og tid|ikke valgt|endre dato og tid/i }).first();
  if (await dateButton.isVisible().catch(() => false)) {
    await dateButton.click();
    await page.waitForTimeout(1000);
  }

  const availableSlot = page
    .locator('button.ws-handover-time-radio-button:not(.ngr-button--disabled)')
    .filter({ hasText: /\d+\s*kr/i })
    .first();
  await expect(availableSlot, 'first available pickup slot should be visible').toBeVisible({ timeout: 15000 });
  const slotTitle = (await availableSlot.getAttribute('title')) || (await availableSlot.innerText());
  await availableSlot.click();
  await page.waitForTimeout(800);

  const handoverDialog = page.locator('dialog.ngr-modal--handover-picker[open]').last();
  const confirmScope = (await handoverDialog.isVisible({ timeout: 3000 }).catch(() => false)) ? handoverDialog : page;
  if (await confirmScope.locator('button').count().catch(() => 0)) {
    await clickAgentControl(confirmScope, {
      label: 'confirm pickup time',
      names: ['Behold henting', 'Bekreft henting', 'Bekreft', 'Velg', 'Oppdater', 'Ferdig'],
      minScore: 0.45,
    });
    await waitForSettled(page);
  } else {
    await waitForSettled(page);
  }

  await expect(page.locator('body')).toContainText(/hente|Kl\.|I dag kl\.|I morgen kl\./i);
  await safeScreenshot(page, 'pickup-confirmed');
  return slotTitle;
}

async function chooseBankCard(page) {
  const bankCard = page.getByText(/^Bankkort$/i).first();
  await expect(bankCard).toBeVisible({ timeout: 15000 });
  await bankCard.click();
  await page.waitForTimeout(800);
  await safeScreenshot(page, 'bank-card-selected');
}

async function chooseBankCardWithAgent(page) {
  const bankCard = page.getByText(/^Bankkort$/i).first();
  if (await bankCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bankCard.click();
  } else {
    await clickAgentControl(page, {
      label: 'bank card',
      names: ['Bankkort', 'Kort', 'Betalingskort'],
      minScore: 0.45,
    });
  }
  await page.waitForTimeout(800);
  await safeScreenshot(page, 'bank-card-selected');
}

async function proceedToPayment(page, context) {
  await clickFirstVisible(page.getByRole('button', { name: /til betaling/i }), 'to payment');
  await waitForSettled(page, 45000);
  const paymentPage = await waitForPaymentSurface(context, page);
  await safeScreenshot(paymentPage, 'payment-opened');
  return paymentPage;
}

async function proceedToPaymentWithAgent(page, context) {
  await clickAgentControl(page, {
    label: 'to payment',
    names: ['Til betaling', 'Gå til betaling', 'Betaling', 'Fortsett til betaling'],
  });
  await waitForSettled(page, 45000);
  const paymentPage = await waitForPaymentSurface(context, page);
  await safeScreenshot(paymentPage, 'payment-opened');
  return paymentPage;
}

async function visibleInputsInFrame(frame) {
  return frame.locator('input').evaluateAll((inputs) =>
    inputs
      .map((input, index) => {
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent || '' : '';
        return {
          index,
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          type: input.getAttribute('type') || '',
          name: input.getAttribute('name') || '',
          id: input.getAttribute('id') || '',
          autocomplete: input.getAttribute('autocomplete') || '',
          placeholder: input.getAttribute('placeholder') || '',
          ariaLabel: input.getAttribute('aria-label') || '',
          label,
          inputMode: input.getAttribute('inputmode') || '',
          maxLength: input.getAttribute('maxlength') || '',
        };
      })
      .filter((input) => input.visible),
  ).catch(() => []);
}

function isFillablePaymentInput(input) {
  const type = (input.type || '').toLowerCase();
  return !['checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'file'].includes(type);
}

function inputText(input) {
  return [
    input.type,
    input.name,
    input.id,
    input.autocomplete,
    input.placeholder,
    input.ariaLabel,
    input.label,
    input.inputMode,
    input.maxLength,
  ].join(' ').toLowerCase();
}

function isPaymentFrameUrl(url = '') {
  return /market-pay|selection\.hpp|walley|aera|nets|payment|checkout|threedssimulator|acs/i.test(url);
}

function isLikelyCardInput(input) {
  const text = inputText(input);
  return /cc-number|cardnumber|card-number|card number|kortnummer|pan\b|accountnumber/.test(text) ||
    (/tel|numeric|number/.test(text) && Number(input.maxLength || 0) >= 12);
}

function isLikelyExpiryInput(input) {
  return /cc-exp|expiry|expiration|utl|exp|mm\s*\/\s*yy|mm\/yy|mmyy|exp.*month|month|mm\b|cc-exp-month|exp.*year|year|yy\b|cc-exp-year/.test(inputText(input));
}

function isLikelyCvcInput(input) {
  return /cvc|cvv|security|sikkerhet|kontroll|cc-csc|card.?code/.test(inputText(input));
}

async function paymentInputCandidates(page) {
  const flat = [];
  for (const frame of page.frames()) {
    const inputs = (await visibleInputsInFrame(frame)).filter(isFillablePaymentInput);
    const inPaymentFrame = isPaymentFrameUrl(frame.url());
    inputs.forEach((input) => {
      if (inPaymentFrame || isLikelyCardInput(input) || isLikelyExpiryInput(input) || isLikelyCvcInput(input)) {
        flat.push({ frame, input, inPaymentFrame });
      }
    });
  }
  return flat;
}

async function waitForPaymentSurface(context, preferredPage) {
  const deadline = Date.now() + 90 * 1000;
  let lastUrl = preferredPage.url();
  while (Date.now() < deadline) {
    const pages = [...context.pages()].reverse().filter((candidate) => !candidate.isClosed());
    for (const candidate of pages) {
      lastUrl = candidate.url();
      const frameUrls = candidate.frames().map((frame) => frame.url()).join(' ');
      const inputs = await paymentInputCandidates(candidate);
      if (inputs.some(({ input }) => isLikelyCardInput(input)) || (isPaymentFrameUrl(`${lastUrl} ${frameUrls}`) && inputs.length)) {
        await candidate.waitForLoadState('domcontentloaded').catch(() => {});
        await candidate.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        console.log(`HC-006-PAYMENT-SURFACE ${JSON.stringify({ url: candidate.url(), frames: candidate.frames().length, inputs: inputs.length })}`);
        return candidate;
      }
    }
    await preferredPage.waitForTimeout(1000).catch(() => {});
  }
  throw new Error(`Payment surface did not become ready before card entry. Last observed URL: ${lastUrl}`);
}

async function fillFrameInput(frame, input, value) {
  const locator = frame.locator('input').nth(input.index);
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(locator).toBeEditable({ timeout: 30000 });
  await locator.click({ timeout: 15000 }).catch(() => {});
  await locator.fill(value, { timeout: 30000 });
  await expect
    .poll(() => locator.inputValue().catch(() => ''), { timeout: 10000 })
    .toBeTruthy();
  const actualValue = await locator.inputValue().catch(() => '');
  const normalizedActual = String(actualValue || '').replace(/\s+/g, '');
  const normalizedExpected = String(value || '').replace(/\s+/g, '');
  if (normalizedExpected.length > 3 && normalizedActual.length > 0 && normalizedActual.length < Math.min(3, normalizedExpected.length)) {
    throw new Error(`Payment input accepted too few characters before continuing. Expected length ${normalizedExpected.length}, got ${normalizedActual.length}.`);
  }
  await locator.press('Tab').catch(() => {});
}

async function fillPaymentDetails(page) {
  const cardNumber = getMenyValue('MENY_TEST_CARD').replace(/\s+/g, '');
  if (!cardNumber) return { cardNumberFilled: false, expiryFilled: false, cvcFilled: false };

  const expiry = getMenyValue('MENY_TEST_EXPIRY', '12/30');
  const cvc = getMenyValue('MENY_TEST_CVC', '123');
  const [expiryMonth, expiryYear] = expiry.split(/[\/\s.-]+/);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const flat = await paymentInputCandidates(page);

    if (flat.length) {
      const card =
        flat.find(({ input }) => isLikelyCardInput(input)) ||
        flat.find(({ inPaymentFrame }) => inPaymentFrame) ||
        flat[0];
      await fillFrameInput(card.frame, card.input, cardNumber);

      const refreshed = [];
      for (const frame of page.frames()) {
        const inputs = (await visibleInputsInFrame(frame)).filter((input) => isFillablePaymentInput(input) && (isPaymentFrameUrl(frame.url()) || isLikelyExpiryInput(input) || isLikelyCvcInput(input)));
        inputs.forEach((input) => refreshed.push({ frame, input }));
      }

      const expiryCombined = refreshed.find(({ input }) => /cc-exp|expiry|expiration|utl|exp|mm\s*\/\s*yy|mm\/yy|mmyy/.test(inputText(input)));
      const monthInput = refreshed.find(({ input }) => /exp.*month|month|mm\b|cc-exp-month/.test(inputText(input)));
      const yearInput = refreshed.find(({ input }) => /exp.*year|year|yy\b|cc-exp-year/.test(inputText(input)));
      if (monthInput && yearInput && monthInput.input.index !== yearInput.input.index) {
        await fillFrameInput(monthInput.frame, monthInput.input, expiryMonth || '12');
        await fillFrameInput(yearInput.frame, yearInput.input, expiryYear || '30');
      } else if (expiryCombined) {
        await fillFrameInput(expiryCombined.frame, expiryCombined.input, expiry);
      } else if (refreshed.length >= 2) {
        await fillFrameInput(refreshed[1].frame, refreshed[1].input, expiry);
      }

      const afterExpiry = [];
      for (const frame of page.frames()) {
        const inputs = (await visibleInputsInFrame(frame)).filter((input) => isFillablePaymentInput(input) && (isPaymentFrameUrl(frame.url()) || isLikelyCvcInput(input)));
        inputs.forEach((input) => afterExpiry.push({ frame, input }));
      }
      const cvcInput =
        afterExpiry.find(({ input }) => isLikelyCvcInput(input)) ||
        afterExpiry[afterExpiry.length - 1];
      if (cvcInput) await fillFrameInput(cvcInput.frame, cvcInput.input, cvc);
      return { cardNumberFilled: true, expiryFilled: Boolean(expiryCombined || monthInput), cvcFilled: Boolean(cvcInput) };
    }
    await page.waitForTimeout(1000);
  }

  return { cardNumberFilled: false, expiryFilled: false, cvcFilled: false };
}

async function visibleControlText(control) {
  return (
    (await control.innerText().catch(() => '')) ||
    (await control.getAttribute('value').catch(() => '')) ||
    (await control.getAttribute('aria-label').catch(() => '')) ||
    ''
  ).trim();
}

function authenticationPriority(text, frameUrl) {
  const normalized = (text || '').trim().toLowerCase();
  const urlBonus = /threedssimulator|acs|market-pay/i.test(frameUrl || '') ? -10 : 0;
  if (normalized === 'authenticated') return urlBonus;
  if (normalized === 'authenticate') return urlBonus + 1;
  if (/^(autentisert|godkjenn|bekreft|confirm)$/.test(normalized)) return urlBonus + 2;
  if (/^(continue|fortsett|submit|ok)$/.test(normalized)) return urlBonus + 20;
  return urlBonus + 50;
}

async function extractOrderConfirmation(page) {
  const body = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
  const confirmationObserved =
    /takk\s+for\s+bestillingen/i.test(body) ||
    /(?:ordre(?:n)?|bestilling(?:en)?)\s+(?:er\s+)?(?:mottatt|opprettet|bekreftet|registrert)/i.test(body) ||
    /ordrebekreftelse/i.test(body);
  const orderNumber =
    body.match(/ordrenummer\s+([0-9]{5,})/i)?.[1] ||
    body.match(/ordrenummer[:\s]+([A-Z0-9-]+)/i)?.[1] ||
    body.match(/ordre(?:n)?\s*(?:din)?\s*(?:er)?\s*(?:opprettet|mottatt|bekreftet)?[^0-9]{0,40}([0-9]{5,})/i)?.[1] ||
    '';
  return {
    url: page.url(),
    orderNumber,
    confirmationObserved,
    bodySnippet: body.replace(/\s+/g, ' ').slice(0, 1200),
  };
}

async function clickPaymentSubmit(page) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (const frame of page.frames()) {
      if (!/market-pay|selection\.hpp/i.test(frame.url())) continue;
      const payText = frame.getByText(/^Betal$/i).first();
      if (await payText.isVisible().catch(() => false)) {
        await payText.click({ timeout: 15000 });
        await waitForSettled(page, 60000);
        return 'Betal';
      }
    }

    const controls = page.locator('button, input[type="submit"], a[role="button"]');
    const count = await controls.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      if (!(await control.isVisible().catch(() => false))) continue;
      const text = await visibleControlText(control);
      if (/^(betal|betal nå|fullfør|bekreft|godkjenn|pay|confirm)$/i.test(text)) {
        await control.click({ timeout: 15000 });
        await waitForSettled(page, 60000);
        return text || 'payment submit';
      }
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Could not find payment submit button.');
}

async function clickAuthenticationStep(page) {
  const authNames = /^(authenticate|authenticated|autentiser|autentisert|godkjenn|bekreft|confirm|continue|fortsett|submit|ok)$/i;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const current = await extractOrderConfirmation(page);
    if (current.confirmationObserved) {
      return { authenticationAttempted: false, authenticationButton: '', authenticationSkippedReason: 'Confirmation was already visible.' };
    }

    const candidates = [];
    for (const frame of page.frames()) {
      const controls = frame.locator('button, input[type="submit"], input[type="button"], a[role="button"]');
      const count = await controls.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const control = controls.nth(index);
        if (!(await control.isVisible().catch(() => false))) continue;
        const text = await visibleControlText(control);
        if (authNames.test(text)) {
          candidates.push({ control, frame, text, priority: authenticationPriority(text, frame.url()) });
        }
      }
    }

    if (candidates.length) {
      candidates.sort((left, right) => left.priority - right.priority);
      const candidate = candidates[0];
      await candidate.control.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.control.click({ timeout: 15000 });
      await waitForSettled(page, 60000);
      return {
        authenticationAttempted: true,
        authenticationButton: candidate.text || 'Authenticate',
        authenticationFrameUrl: candidate.frame.url(),
        authenticationSkippedReason: '',
      };
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Could not find Authenticate button after payment submit.');
}

async function waitForOrderConfirmation(page, context) {
  const deadline = Date.now() + ORDER_CONFIRMATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const pages = [...context.pages()].reverse();
    for (const candidate of pages) {
      if (!isMenyPage(candidate)) continue;
      const confirmation = await extractOrderConfirmation(candidate);
      if (confirmation.confirmationObserved && confirmation.orderNumber) {
        await safeScreenshot(candidate, `order-confirmation-${confirmation.orderNumber}`);
        return { page: candidate, confirmation };
      }
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('Meny viste ikke "Takk for bestillingen" med ordrenummer innen ventetiden.');
}

async function openRsRoute(page, route) {
  const url = `${RS_BASE_URL.replace(/\/$/, '')}/#/${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page, 45000);
}

async function applyRsOrderSearch(page, orderNumber) {
  const inputs = page.locator('input[type="search"], input[placeholder*="Søk" i], input[aria-label*="Søk" i], input[type="text"]');
  const count = await inputs.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    if (!(await input.isVisible().catch(() => false))) continue;
    await input.fill(orderNumber);
    await input.press('Enter').catch(() => {});
    await waitForSettled(page, 30000);
    return true;
  }
  return false;
}

async function verifyOrderInRsPickCollect(page, orderNumber) {
  const routes = [
    { route: 'pickAndCollect/ordersToPick', label: 'Ordre til plukk' },
    { route: 'pickAndCollect/ordersInProgress', label: 'Plukk startet' },
    { route: 'pickAndCollect/ordersToCollect', label: 'Ordre til henting' },
    { route: 'pickAndCollect/futureOrders', label: 'Fremtidige bestillinger' },
    { route: 'pickAndCollect/ordersArchive', label: 'Ordrearkiv' },
  ];

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || RS_STORE_NAME);

  const findings = [];
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    for (const target of routes) {
      await openRsRoute(page, target.route);
      const searchApplied = await applyRsOrderSearch(page, orderNumber);
      const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
      const found = body.includes(orderNumber);
      findings.push({ route: target.route, label: target.label, searchApplied, found });
      if (found) {
        await safeScreenshot(page, `rs-pickcollect-${orderNumber}`);
        return { status: 'PASS', orderFound: true, matchedRoute: target.route, matchedRouteLabel: target.label, findings };
      }
    }
    await page.waitForTimeout(30000);
  }

  await safeScreenshot(page, `rs-pickcollect-not-found-${orderNumber}`);
  return { status: 'BLOCKED', orderFound: false, orderNumber, findings: findings.slice(-routes.length) };
}

function numberFromMatch(value, fallback = 0) {
  const normalized = String(value || '').replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function estimatePickedWeightKg(text) {
  const body = String(text || '');
  const gramMatch = body.match(/a\s+(\d+(?:[,.]\d+)?)\s*gram/i);
  if (gramMatch) {
    return Math.max(0.001, numberFromMatch(gramMatch[1]) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }
  const kgMatch = body.match(/(\d+(?:[,.]\d+)?)\s*kg/i);
  if (kgMatch) {
    return String(numberFromMatch(kgMatch[1], 1));
  }
  return '1';
}

async function clickVisibleButton(page, pattern, label, timeout = 15000) {
  const buttons = page.getByRole('button', { name: pattern });
  const count = await buttons.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    await expect(button, `${label} should be enabled`).toBeEnabled({ timeout });
    await button.click({ timeout });
    await waitForSettled(page, 45000);
    return true;
  }
  return false;
}

async function confirmVisibleDialog(page, label) {
  const yes = page.getByRole('button', { name: /^Ja$/i });
  const count = await yes.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    const button = yes.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    await expect(button, `${label} confirmation should be enabled`).toBeEnabled({ timeout: 15000 });
    await button.click();
    await waitForSettled(page, 45000);
    return true;
  }
  return false;
}

function pickedSummary(bodyText) {
  const body = String(bodyText || '');
  const pickedTab = body.match(/PLUKKEDE VARER\s*\|\s*(\d+)\s*\/\s*(\d+)/i);
  const unpickedTab = body.match(/VARER\s*\|\s*(\d+)\s*\/\s*(\d+)/i);
  return {
    picked: pickedTab ? Number(pickedTab[1]) : 0,
    total: pickedTab ? Number(pickedTab[2]) : 0,
    unpicked: unpickedTab ? Number(unpickedTab[1]) : 0,
  };
}

async function pickFirstVisibleOrderLine(page, orderNumber) {
  const details = page.getByRole('button', { name: /^Detaljer$/i });
  if (await details.first().isVisible().catch(() => false)) {
    await details.first().click();
    await waitForSettled(page, 30000);
  }

  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const numberInputs = page.locator('input[type="number"]');
  const inputCount = await numberInputs.count().catch(() => 0);
  let filledQuantity = false;
  for (let index = 0; index < inputCount; index += 1) {
    const input = numberInputs.nth(index);
    if (!(await input.isVisible().catch(() => false))) continue;
    if (!(await input.isEnabled().catch(() => false))) continue;
    await input.fill(estimatePickedWeightKg(bodyText));
    await input.press('Tab').catch(() => {});
    filledQuantity = true;
    break;
  }
  if (!filledQuantity) {
    throw new Error(`Fant ikke aktivt antallsfelt for ordrelinje i RS Store (${orderNumber}).`);
  }

  const modalPickButtons = page.getByRole('button', { name: /^Plukk$/i });
  const pickCount = await modalPickButtons.count().catch(() => 0);
  for (let index = 0; index < pickCount; index += 1) {
    const button = modalPickButtons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;
    await button.click();
    await waitForSettled(page, 30000);
    break;
  }

  const ok = page.getByRole('button', { name: /^OK$/i }).last();
  if (await ok.isVisible().catch(() => false)) {
    await expect(ok).toBeEnabled({ timeout: 15000 });
    await ok.click();
    await waitForSettled(page, 45000);
  }

  await safeScreenshot(page, `rs-pickcollect-picked-line-${orderNumber}`);
}

async function pickAllVisibleOrderLines(page, orderNumber) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const summary = pickedSummary(body);
    if (summary.total > 0 && summary.picked >= summary.total && summary.unpicked === 0) {
      return { picked: summary.picked, total: summary.total };
    }

    if (!(await page.getByRole('button', { name: /^Detaljer$|^Plukk$/i }).first().isVisible().catch(() => false))) {
      break;
    }

    await pickFirstVisibleOrderLine(page, orderNumber);
  }

  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const summary = pickedSummary(body);
  if (summary.total > 0 && summary.picked >= summary.total && summary.unpicked === 0) {
    return { picked: summary.picked, total: summary.total };
  }
  throw new Error(`Klarte ikke plukke alle synlige varelinjer i RS Store. Status: ${JSON.stringify(summary)}`);
}

async function savePackagingAndVerifyToCollect(page, orderNumber) {
  const numberInputs = page.locator('input[type="number"]');
  const inputCount = await numberInputs.count().catch(() => 0);
  for (let index = 0; index < inputCount; index += 1) {
    const input = numberInputs.nth(index);
    if (!(await input.isVisible().catch(() => false))) continue;
    if (!(await input.isEnabled().catch(() => false))) continue;
    await input.fill('1');
    break;
  }

  if (!(await clickVisibleButton(page, /^Lagre$/i, 'save packaging'))) {
    throw new Error('Fant ikke Lagre-knappen i emballasje-steget etter plukk.');
  }

  await openRsRoute(page, 'pickAndCollect/ordersToCollect');
  await applyRsOrderSearch(page, orderNumber);
  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  await safeScreenshot(page, `rs-pickcollect-ready-for-collect-${orderNumber}`);
  if (!body.includes(orderNumber)) {
    throw new Error(`Ordre ${orderNumber} ble ikke funnet i Ordre til henting etter plukk.`);
  }
}

async function deliverReadyOrder(page, orderNumber) {
  if (!(await clickVisibleButton(page, /^Fortsett$/i, 'continue to delivery details'))) {
    await openRsRoute(page, `pickAndCollect/ordersToCollect/${orderNumber}`);
    await waitForSettled(page, 45000);
  }

  await safeScreenshot(page, `rs-pickcollect-ready-order-${orderNumber}`);
  if (!(await clickVisibleButton(page, /Utlever ordre/i, 'deliver order'))) {
    throw new Error(`Fant ikke Utlever ordre for ordre ${orderNumber}.`);
  }
  await confirmVisibleDialog(page, 'deliver order');

  await openRsRoute(page, 'pickAndCollect/ordersArchive');
  await applyRsOrderSearch(page, orderNumber);
  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  await safeScreenshot(page, `rs-pickcollect-archive-${orderNumber}`);
  if (!body.includes(orderNumber)) {
    throw new Error(`Ordre ${orderNumber} ble ikke funnet i Ordrearkiv etter utlevering.`);
  }
}

async function completeOrderInRsPickCollect(page, orderNumber, verification = {}) {
  const completion = {
    status: 'NOT_RUN',
    orderNumber,
    startedPicking: false,
    pickedItems: false,
    pickConfirmed: false,
    packagingSaved: false,
    delivered: false,
    archived: false,
    routeStartedFrom: verification.matchedRoute || '',
    notes: [],
  };

  if (verification.matchedRoute === 'pickAndCollect/ordersArchive') {
    completion.status = 'PASS';
    completion.delivered = true;
    completion.archived = true;
    completion.notes.push('Ordren lå allerede i Ordrearkiv.');
    return completion;
  }

  if (verification.matchedRoute === 'pickAndCollect/futureOrders') {
    await openRsRoute(page, 'pickAndCollect/futureOrders');
    await applyRsOrderSearch(page, orderNumber);
    if (!(await clickVisibleButton(page, /Start plukking/i, 'start picking future order'))) {
      throw new Error(`Fant ikke Start plukking for fremtidig ordre ${orderNumber}.`);
    }
    await confirmVisibleDialog(page, 'start picking future order');
    completion.startedPicking = true;
  } else if (verification.matchedRoute === 'pickAndCollect/ordersToPick') {
    await openRsRoute(page, 'pickAndCollect/ordersToPick');
    await applyRsOrderSearch(page, orderNumber);
    await clickVisibleButton(page, /Start plukking|Fortsett plukk|Detaljer/i, 'open order picking');
    completion.startedPicking = true;
  } else if (verification.matchedRoute === 'pickAndCollect/ordersInProgress') {
    await openRsRoute(page, 'pickAndCollect/ordersInProgress');
    await applyRsOrderSearch(page, orderNumber);
    await clickVisibleButton(page, /Fortsett plukk/i, 'continue picking');
  } else if (verification.matchedRoute === 'pickAndCollect/ordersToCollect') {
    await openRsRoute(page, 'pickAndCollect/ordersToCollect');
    await applyRsOrderSearch(page, orderNumber);
    await deliverReadyOrder(page, orderNumber);
    completion.status = 'PASS';
    completion.delivered = true;
    completion.archived = true;
    return completion;
  } else {
    await openRsRoute(page, `pickAndCollect/ordersToPickdetails/${orderNumber}/`);
  }

  if (!/#\/pickAndCollect\/ordersToPickdetails\//i.test(page.url())) {
    await openRsRoute(page, `pickAndCollect/ordersToPickdetails/${orderNumber}/`);
  }

  await safeScreenshot(page, `rs-pickcollect-pick-details-${orderNumber}`);
  completion.pickSummary = await pickAllVisibleOrderLines(page, orderNumber);
  completion.pickedItems = true;

  if (!(await clickVisibleButton(page, /^Fortsett$/i, 'continue to picking finalization'))) {
    throw new Error(`Fant ikke Fortsett etter plukk for ordre ${orderNumber}.`);
  }

  const finalBody = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  if (!/Plukket\s*\(\s*\d+\s*\/\s*\d+\s*\)/i.test(finalBody)) {
    throw new Error(`Finaliseringssiden viser ikke at ordre ${orderNumber} er plukket.`);
  }
  await safeScreenshot(page, `rs-pickcollect-finalize-${orderNumber}`);

  if (!(await clickVisibleButton(page, /^Bekreft$/i, 'confirm picked order'))) {
    throw new Error(`Fant ikke Bekreft på finaliseringssiden for ordre ${orderNumber}.`);
  }
  await confirmVisibleDialog(page, 'finish picking');
  completion.pickConfirmed = true;

  await safeScreenshot(page, `rs-pickcollect-packaging-${orderNumber}`);
  await savePackagingAndVerifyToCollect(page, orderNumber);
  completion.packagingSaved = true;

  await deliverReadyOrder(page, orderNumber);
  completion.delivered = true;
  completion.archived = true;
  completion.status = 'PASS';
  return completion;
}

test.describe('HC-006 Opprette ordre i Meny Preprod', () => {
  test.setTimeout(15 * 60 * 1000);

  test('opprett ordre, fang ordrenummer og verifiser i RS Pick&Collect', async ({ page, context }) => {
    fs.mkdirSync(evidenceDir, { recursive: true });

    const result = {
      runId,
      result: 'BLOCKED',
      url: MENY_PREPROD_URL,
      pickupStore: DEFAULT_PICKUP_STORE,
      productSearch: DEFAULT_PRODUCT_SEARCH,
      pickupSlot: '',
      paymentPageReached: false,
      cardNumberFilled: false,
      expiryFilled: false,
      cvcFilled: false,
      paymentSubmitButton: '',
      authentication: null,
      orderPlaced: false,
      orderNumber: '',
      confirmationUrl: '',
      confirmationObserved: false,
      rsVerification: { status: 'NOT_RUN' },
      rsCompletion: { status: 'NOT_RUN' },
      evidencePrefix: `test-artifacts/evidence/HC-006-${runId}-`,
      notes: [],
    };

    page = await loginToMeny(page, context);
    await clearCart(page);
    await searchForProduct(page);
    await addFirstAvailableProduct(page);
    await openCheckoutWithAgent(page);
    await continueToCheckoutStep2WithAgent(page);
    result.pickupSlot = await chooseFirstPickupSlotWithAgent(page);
    await chooseBankCardWithAgent(page);
    const paymentPage = await proceedToPaymentWithAgent(page, context);
    result.paymentPageReached = true;
    

    if (ALLOW_PLACE_ORDER) {
      const paymentDetails = await fillPaymentDetails(paymentPage);
      result.cardNumberFilled = paymentDetails.cardNumberFilled;
      result.expiryFilled = paymentDetails.expiryFilled;
      result.cvcFilled = paymentDetails.cvcFilled;
      result.paymentSubmitButton = await clickPaymentSubmit(paymentPage);
      result.authentication = await clickAuthenticationStep(paymentPage);

      const { page: confirmationPage, confirmation } = await waitForOrderConfirmation(paymentPage, context);
      result.orderPlaced = true;
      result.orderNumber = confirmation.orderNumber;
      result.confirmationObserved = confirmation.confirmationObserved;
      result.confirmationUrl = confirmation.url;
      await safeScreenshot(confirmationPage, `order-confirmation-${result.orderNumber}`);

      if (VERIFY_RS_PICKCOLLECT) {
        const rsPage = await context.newPage();
        try {
          result.rsVerification = await verifyOrderInRsPickCollect(rsPage, result.orderNumber);
        } catch (error) {
          result.rsVerification = {
            status: 'ERROR',
            orderFound: false,
            orderNumber: result.orderNumber,
            error: error.message,
          };
        }

        if (COMPLETE_RS_PICKCOLLECT_ORDER && result.rsVerification.orderFound) {
          try {
            result.rsCompletion = await completeOrderInRsPickCollect(rsPage, result.orderNumber, result.rsVerification);
          } catch (error) {
            result.rsCompletion = {
              status: 'ERROR',
              orderNumber: result.orderNumber,
              error: error.message,
            };
          }
        } else if (!COMPLETE_RS_PICKCOLLECT_ORDER) {
          result.notes.push('RS Pick&Collect completion was skipped because HC006_COMPLETE_RS_PICKCOLLECT_ORDER=0.');
        } else if (VERIFY_RS_PICKCOLLECT) {
          result.rsCompletion = {
            status: 'SKIPPED',
            orderNumber: result.orderNumber,
            reason: 'Order was not found in RS Pick&Collect.',
          };
        }
      } else {
        result.notes.push('RS Pick&Collect verification was skipped because HC006_VERIFY_RS_PICKCOLLECT=0.');
      }
    } else {
      result.notes.push('Stopped before order placement. Set MENY_ALLOW_PLACE_ORDER=1 to allow final submission.');
    }
    result.result =
      result.orderPlaced &&
      (!VERIFY_RS_PICKCOLLECT || result.rsVerification.orderFound) &&
      (!VERIFY_RS_PICKCOLLECT || !COMPLETE_RS_PICKCOLLECT_ORDER || result.rsCompletion.archived)
        ? 'PASS'
        : 'BLOCKED';
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`HC-006-RESULT ${JSON.stringify(result, null, 2)}`);

    expect(result.paymentPageReached).toBeTruthy();
    expect(result.result, JSON.stringify(result, null, 2)).toBe('PASS');
    expect(result.confirmationObserved, JSON.stringify(result, null, 2)).toBeTruthy();
    expect(result.orderNumber, JSON.stringify(result, null, 2)).toMatch(/^[0-9]{5,}$/);
    if (VERIFY_RS_PICKCOLLECT) {
      expect(result.rsVerification.orderFound, JSON.stringify(result, null, 2)).toBeTruthy();
      if (COMPLETE_RS_PICKCOLLECT_ORDER) {
        expect(result.rsCompletion.archived, JSON.stringify(result, null, 2)).toBeTruthy();
      }
    }
  });
});
