const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_MENY_PREPROD_URL, getMenyValue, getRequiredMenyValue } = require('../test-artifacts/playwright/helpers/meny-preprod');

const MENY_PREPROD_URL = getMenyValue('MENY_PREPROD_URL', DEFAULT_MENY_PREPROD_URL);
const MENY_HOST = new URL(MENY_PREPROD_URL).hostname;
const DEFAULT_PRODUCT_SEARCH = process.env.MENY_PRODUCT_SEARCH || 'banan';
const readyFile = path.resolve('test-artifacts/evidence/HC-006-payment-page-ready.json');
const paymentDebugFile = path.resolve('test-artifacts/evidence/HC-006-payment-debug.json');
const userDataDir = path.resolve('test-artifacts/.browser-profiles/hc-006-edge');
const COMPLETE_ORDER = process.env.MENY_COMPLETE_ORDER === '1';

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
      return;
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
      return;
    }
  }
  throw new Error(`Could not find visible input: ${label}`);
}

async function openMeny(page) {
  await page.goto(MENY_PREPROD_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/MENY/i);
}

async function isLoggedIn(page) {
  const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  return /Hei,/i.test(body);
}

async function loginToMeny(page, context) {
  const phone = getRequiredMenyValue('MENY_TEST_PHONE');
  const password = getRequiredMenyValue('MENY_TEST_PASSWORD');
  const otpCode = getMenyValue('MENY_TEST_OTP_CODE');

  await openMeny(page);
  if (await isLoggedIn(page)) return page;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const newPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await clickFirstVisible(page.getByTestId('LoginButton'), 'header login');
    await clickFirstVisible(page.getByRole('button', { name: /fortsett med trumf/i }), 'continue with Trumf');
    const newPage = await newPagePromise;
    if (newPage) {
      page = newPage;
    } else {
      await page.waitForURL((url) => {
        try {
          return new URL(url).hostname !== MENY_HOST;
        } catch {
          return false;
        }
      }, { timeout: 15000 }).catch(() => {});
      page = await activePage(context);
    }
    await waitForSettled(page);

    page = await activePage(context);
    if (!isMenyPage(page)) {
      const phoneInput = page.locator('input[type="tel"], input').first();
      await expect(phoneInput).toBeVisible({ timeout: 20000 });
      await fillFirstVisible(phoneInput, phone, 'Trumf phone');
      await clickFirstVisible(page.getByRole('button', { name: /fortsett/i }), 'submit phone');
      await waitForSettled(page);
      page = await activePage(context);
    }

    if (!isMenyPage(page)) {
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill(password);
        await clickFirstVisible(page.getByRole('button', { name: /fortsett|logg inn/i }), 'submit password');
        await waitForSettled(page);
        page = await activePage(context);
      }
    }

    if (!isMenyPage(page)) {
      const otpInput = page.locator('#one-time-code');
      await otpInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      if (await otpInput.isVisible().catch(() => false)) {
        if (!otpCode) {
          throw new Error('Trumf login requested SMS code. Set MENY_TEST_OTP_CODE or save it encrypted for this run.');
        }
        await otpInput.fill(otpCode);
        await page.keyboard.press('Enter').catch(() => {});
        await waitForSettled(page, 45000);
        page = await activePage(context);
      }
    }

    await page.waitForTimeout(2500);
    page = await activePage(context);
    if (!isMenyPage(page)) {
      await page.goto(MENY_PREPROD_URL, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await waitForSettled(page);
    }
    if (await isLoggedIn(page)) return page;

    await openMeny(page);
  }

  await expect.poll(() => isMenyPage(page), { timeout: 45000 }).toBeTruthy();
  await expect(page.locator('body')).toContainText(/Hei,/i, { timeout: 20000 });
  return page;
}

async function clearCart(page) {
  await page.goto(new URL('/kassen', MENY_PREPROD_URL).toString(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);

  const removeAll = page.getByText(/^Fjern alle$/i).first();
  if (await removeAll.isVisible().catch(() => false)) {
    await removeAll.click();
    await page.waitForTimeout(800);
    const confirm = page.getByRole('button', { name: /fjern alle|tom|bekreft|ja/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await waitForSettled(page);
    }
  }

  const emptyCart = page.getByRole('button', { name: /tom handlevognen|tom/i }).first();
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
}

async function addProduct(page) {
  await page.goto(MENY_PREPROD_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForSettled(page);

  const searchInput = page.locator('header input, input[type="search"], input[placeholder*="lurer" i]').first();
  await searchInput.fill(DEFAULT_PRODUCT_SEARCH);
  await page.keyboard.press('Enter');
  await waitForSettled(page);

  const addButtons = page.getByRole('button', { name: /legg .+ i handlevognen/i });
  await expect(addButtons.first()).toBeVisible({ timeout: 30000 });
  await clickFirstVisible(addButtons, 'add product');
  await handleExistingOrderDialog(page);
  await expect(page.locator('body')).toContainText(/vare i handlevognen/i, { timeout: 15000 });
}

async function handleExistingOrderDialog(page) {
  const editOrderDialog = page.locator('dialog.ngr-modal--edit-order[open]').first();
  if (!(await editOrderDialog.isVisible().catch(() => false))) return false;

  const startNewOrder = editOrderDialog.getByRole('button', { name: /start ny bestilling/i }).first();
  await expect(startNewOrder).toBeVisible({ timeout: 10000 });
  await startNewOrder.click();
  await waitForSettled(page);
  await expect(editOrderDialog).toBeHidden({ timeout: 15000 });
  return true;
}

async function openCheckout(page) {
  await handleExistingOrderDialog(page);
  await clickFirstVisible(page.locator('button.ws-cart-button'), 'cart button');
  await page.waitForTimeout(1200);
  await clickFirstVisible(page.getByRole('button', { name: /til kassen|ga til kassen|kasse/i }), 'checkout button');
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Kassen/i);
}

async function continueToCheckoutStep2(page) {
  await clickFirstVisible(page.getByRole('button', { name: /^Neste$/i }), 'checkout next');
  await waitForSettled(page);
  await expect(page.locator('body')).toContainText(/Leverings- og betalingsinformasjon|Dato og tid/i);
}

async function chooseFirstPickupSlot(page) {
  const dateButton = page.getByRole('button', { name: /velg dato og tid|dato og tid|ikke valgt|endre dato og tid/i }).first();
  if (await dateButton.isVisible().catch(() => false)) {
    await dateButton.click();
    await page.waitForTimeout(1000);
  }

  const slots = page
    .locator('button.ws-handover-time-radio-button:not(.ngr-button--disabled)')
    .filter({ hasText: /\d+\s*kr/i });
  await expect(slots.first()).toBeVisible({ timeout: 15000 });

  const slotCount = await slots.count();
  let pickedSlot = false;
  for (let index = 0; index < slotCount; index += 1) {
    const slot = slots.nth(index);
    const text = await slot.innerText().catch(() => '');
    if (/frist|utl.pt|ikke tilgjengelig/i.test(text)) {
      continue;
    }
    await slot.click();
    pickedSlot = true;
    break;
  }
  if (!pickedSlot) {
    throw new Error('Could not find a non-expired pickup slot.');
  }
  await page.waitForTimeout(800);

  const dialog = page.locator('dialog.ngr-modal--handover-picker[open]').first();
  if (await dialog.isVisible().catch(() => false)) {
    const confirm = dialog.getByRole('button').filter({ hasText: /bekreft|velg/i }).last();
    if (await confirm.isVisible().catch(() => false)) {
      await expect(confirm).toBeEnabled({ timeout: 15000 });
      await confirm.click();
    } else {
      const buttons = dialog.getByRole('button');
      const count = await buttons.count().catch(() => 0);
      for (let index = count - 1; index >= 0; index -= 1) {
        const button = buttons.nth(index);
        if ((await button.isVisible().catch(() => false)) && (await button.isEnabled().catch(() => false))) {
          await button.click();
          break;
        }
      }
    }
    await waitForSettled(page);
    await expect(dialog).toBeHidden({ timeout: 15000 });
  }
}

async function chooseBankCard(page) {
  const bankCard = page.getByText(/^Bankkort$/i).first();
  await expect(bankCard).toBeVisible({ timeout: 15000 });
  await bankCard.click();
  await page.waitForTimeout(800);
}

async function proceedToPayment(page, context) {
  await clickFirstVisible(page.getByRole('button', { name: /til betaling/i }), 'to payment');
  await waitForSettled(page, 45000);
  return waitForPaymentSurface(context, page);
}

async function visibleInputsInFrame(frame) {
  return frame.locator('input').evaluateAll((inputs) =>
    inputs
      .map((input, index) => {
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        const label = input.id
          ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent || ''
          : '';
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
  await expect.poll(() => locator.inputValue().catch(() => ''), { timeout: 10000 }).toBeTruthy();
  const actualValue = await locator.inputValue().catch(() => '');
  const normalizedActual = String(actualValue || '').replace(/\s+/g, '');
  const normalizedExpected = String(value || '').replace(/\s+/g, '');
  if (normalizedExpected.length > 3 && normalizedActual.length > 0 && normalizedActual.length < Math.min(3, normalizedExpected.length)) {
    throw new Error(`Payment input accepted too few characters before continuing. Expected length ${normalizedExpected.length}, got ${normalizedActual.length}.`);
  }
  await locator.press('Tab').catch(() => {});
}

async function fillPaymentDetails(page) {
  const cardNumber = getRequiredMenyValue('MENY_TEST_CARD').replace(/\s+/g, '');
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

      const remainingAfterCard = flat.filter((entry) => entry !== card);
      const refreshed = [];
      for (const frame of page.frames()) {
        const inputs = (await visibleInputsInFrame(frame)).filter((input) => isFillablePaymentInput(input) && (isPaymentFrameUrl(frame.url()) || isLikelyExpiryInput(input) || isLikelyCvcInput(input)));
        inputs.forEach((input) => refreshed.push({ frame, input }));
      }

      const expiryCombined =
        refreshed.find(({ input }) => /cc-exp|expiry|expiration|utl|exp|mm\s*\/\s*yy|mm\/yy|mmyy/.test(inputText(input))) ||
        remainingAfterCard.find(({ input }) => /cc-exp|expiry|expiration|utl|exp|mm\s*\/\s*yy|mm\/yy|mmyy/.test(inputText(input)));
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
      await fillFrameInput(cvcInput.frame, cvcInput.input, cvc);

      return {
        cardNumberFilled: true,
        expiryFilled: true,
        cvcFilled: true,
        inputFrameCount: flat.length,
      };
    }

    await page.waitForTimeout(1000);
  }

  throw new Error('Could not find visible payment inputs.');
}

async function clickPaymentSubmit(page) {
  const submitNames = /^(betal|betal na|betal nå|betal\s+\d|betale|fullfor|fullfor ordre|fullfør|fullfør ordre|bekreft|bekreft og betal|godkjenn|pay|confirm|continue|fortsett)/i;
  const excludedNames = /betalingsinformasjon|bankkort|walley|gavekort|leveringsinformasjon|dato og tid/i;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (const frame of page.frames()) {
      if (!/market-pay|selection\.hpp/i.test(frame.url())) continue;
      const payText = frame.getByText(/^Betal$/i).first();
      if (await payText.isVisible().catch(() => false)) {
        await payText.click({ timeout: 15000 });
        await waitForSettled(page, 60000);
        return 'Betal';
      }
      const submitted = await frame.evaluate(() => {
        const isPayText = (value) => /^betal$/i.test((value || '').trim());
        const candidates = [...document.querySelectorAll('button, input[type="submit"], a, [role="button"]')];
        const payControl = candidates.find((item) => isPayText(item.innerText || item.value || item.getAttribute('aria-label')));
        if (payControl) {
          payControl.click();
          return true;
        }
        const form = document.querySelector('form');
        if (form && form.requestSubmit) {
          form.requestSubmit();
          return true;
        }
        if (form) {
          form.submit();
          return true;
        }
        return false;
      }).catch(() => false);
      if (submitted) {
        await waitForSettled(page, 60000);
        return 'Betal';
      }
    }

    const modal = page.locator('dialog[open]').last();
    if (await modal.isVisible().catch(() => false)) {
      const modalControls = modal.locator('button, input[type="submit"], a[role="button"]');
      const modalCount = await modalControls.count().catch(() => 0);
      for (let index = 0; index < modalCount; index += 1) {
        const control = modalControls.nth(index);
        if (!(await control.isVisible().catch(() => false))) continue;
        const text = (
          (await control.innerText().catch(() => '')) ||
          (await control.getAttribute('value').catch(() => '')) ||
          (await control.getAttribute('aria-label').catch(() => ''))
          || ''
        ).trim();
        if (submitNames.test(text) && !excludedNames.test(text)) {
          await control.click({ timeout: 15000 });
          await waitForSettled(page, 60000);
          return text || 'payment submit';
        }
      }
    }

    for (const frame of page.frames()) {
      const controls = frame.locator('button, input[type="submit"], a[role="button"]');
      const count = await controls.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const control = controls.nth(index);
        if (!(await control.isVisible().catch(() => false))) continue;
        const text = (
          (await control.innerText().catch(() => '')) ||
          (await control.getAttribute('value').catch(() => '')) ||
          (await control.getAttribute('aria-label').catch(() => ''))
          || ''
        ).trim();
        if (submitNames.test(text) && !excludedNames.test(text)) {
          await control.click({ timeout: 15000 });
          await waitForSettled(page, 60000);
          return text || 'payment submit';
        }
      }
    }
    if (attempt === 10) {
      await page.keyboard.press('Enter').catch(() => {});
      await waitForSettled(page, 15000);
    }
    await page.waitForTimeout(1000);
  }
  await writePaymentDebug(page);
  throw new Error('Could not find payment submit button.');
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
  if (normalized === 'authenticated') return urlBonus + 0;
  if (normalized === 'authenticate') return urlBonus + 1;
  if (/^(autentisert|godkjenn|bekreft|confirm)$/.test(normalized)) return urlBonus + 2;
  if (/^(continue|fortsett|submit|ok)$/.test(normalized)) return urlBonus + 20;
  return urlBonus + 50;
}

async function clickAuthenticationStep(page) {
  const authNames = /^(authenticate|authenticated|autentiser|autentisert|godkjenn|bekreft|confirm|continue|fortsett|submit|ok)$/i;
  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    const current = await extractOrderResult(page, 1000);
    if (current.confirmationObserved) {
      return {
        authenticationAttempted: false,
        authenticationButton: '',
        authenticationSkippedReason: 'Order confirmation was visible before an authentication button appeared.',
      };
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
          candidates.push({
            control,
            frame,
            text,
            priority: authenticationPriority(text, frame.url()),
          });
        }
      }
    }

    if (candidates.length) {
      candidates.sort((left, right) => left.priority - right.priority);
      const candidate = candidates[0];
      await candidate.control.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await candidate.control.click({ timeout: 15000 });
      await waitForSettled(page, 60000);
      return {
        authenticationAttempted: true,
        authenticationButton: candidate.text || 'Authenticate',
        authenticationFrameUrl: candidate.frame.url(),
        authenticationSkippedReason: '',
      };
    }

    for (const frame of page.frames()) {
      const clickedByDom = await frame.evaluate(() => {
        const exactPriority = (text) => {
          const normalized = (text || '').trim().toLowerCase();
          if (normalized === 'authenticated') return 0;
          if (normalized === 'authenticate') return 1;
          if (/^(autentisert|godkjenn|bekreft|confirm)$/.test(normalized)) return 2;
          if (/^(continue|fortsett|submit|ok)$/.test(normalized)) return 20;
          return 50;
        };
        const candidates = [...document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')]
          .map((item) => ({
            item,
            text: (item.innerText || item.value || item.getAttribute('aria-label') || '').trim(),
          }))
          .filter((candidate) => /^(authenticate|authenticated|autentiser|autentisert|godkjenn|bekreft|confirm|continue|fortsett|submit|ok)$/i.test(candidate.text))
          .sort((left, right) => exactPriority(left.text) - exactPriority(right.text));
        const candidate = candidates[0];
        if (!candidate) return '';
        candidate.item.scrollIntoView({ block: 'center', inline: 'center' });
        candidate.item.click();
        return candidate.text || 'Authenticate';
      }).catch(() => '');

      if (clickedByDom) {
        await waitForSettled(page, 60000);
        return {
          authenticationAttempted: true,
          authenticationButton: clickedByDom,
          authenticationFrameUrl: frame.url(),
          authenticationSkippedReason: '',
        };
      }
    }

    await page.waitForTimeout(1000);
  }

  await writePaymentDebug(page);
  throw new Error('Could not find Authenticate button after payment submit.');
}

function sanitizeText(text) {
  return (text || '').replace(/\b\d{4,}\b/g, '[number]').replace(/\s+/g, ' ').slice(0, 2000);
}

async function writePaymentDebug(page) {
  const frames = [];
  for (const frame of page.frames()) {
    const controls = await frame.locator('button, input[type="submit"], a[role="button"]').evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        const style = window.getComputedStyle(item);
        return {
          tag: item.tagName,
          type: item.getAttribute('type') || '',
          text: (item.innerText || item.getAttribute('value') || item.getAttribute('aria-label') || '').trim(),
          disabled: item.disabled || item.getAttribute('aria-disabled') === 'true',
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        };
      }),
    ).catch((error) => [{ error: error.message }]);
    const inputs = (await visibleInputsInFrame(frame)).map((input) => ({
      ...input,
      valuePresent: undefined,
    }));
    const bodyText = await frame.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    frames.push({
      url: frame.url(),
      controls,
      inputs,
      bodyText: sanitizeText(bodyText),
    });
  }
  fs.writeFileSync(paymentDebugFile, JSON.stringify({ at: new Date().toISOString(), pageUrl: page.url(), frames }, null, 2), 'utf8');
}

async function writePageDebug(page, fileName = 'HC-006-page-debug.json') {
  const debugPath = path.resolve('test-artifacts/evidence', fileName);
  const dialogs = await page.locator('dialog[open]').evaluateAll((items) =>
    items.map((dialog, index) => ({
      index,
      className: dialog.className,
      text: dialog.innerText,
      controls: [...dialog.querySelectorAll('button, input[type="button"], input[type="submit"], a')]
        .map((item) => (item.innerText || item.value || item.getAttribute('aria-label') || '').trim()),
    })),
  ).catch((error) => [{ error: error.message }]);
  const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  fs.writeFileSync(
    debugPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        url: page.url(),
        dialogs,
        bodyText: sanitizeText(bodyText),
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function extractOrderResult(page, settleMs = 5000) {
  await page.waitForTimeout(settleMs);
  const body = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
  const confirmationObserved =
    /takk\s+for\s+(bestillingen|ordren)/i.test(body) ||
    /(?:ordre(?:n)?|bestilling(?:en)?)\s+(?:er\s+)?(?:mottatt|opprettet|bekreftet|registrert)/i.test(body) ||
    /ordrebekreftelse/i.test(body);
  const orderNumber =
    body.match(/ordrenummer[:\s]+([A-Z0-9-]+)/i)?.[1] ||
    body.match(/ordre(?:n)?\s*(?:din)?\s*(?:er)?\s*(?:opprettet|mottatt|bekreftet)?[^0-9]{0,40}([0-9]{5,})/i)?.[1] ||
    body.match(/\b([0-9]{6,})\b/)?.[1] ||
    '';
  return {
    url: page.url(),
    orderNumber,
    confirmationObserved,
    bodySnippet: body.replace(/\s+/g, ' ').slice(0, 1200),
  };
}

async function waitForManualLogin(page) {
  if (page.url() === 'about:blank') {
    await openMeny(page).catch(() => {});
  }
  fs.writeFileSync(
    readyFile,
    JSON.stringify(
      {
        ready: false,
        manualLoginNeeded: true,
        at: new Date().toISOString(),
        url: page.url(),
        note: 'Automatic login did not complete. Complete login in the visible browser; the script will continue to payment after Meny shows a logged-in session.',
      },
      null,
      2,
    ),
    'utf8',
  );

  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    page = await activePage(page.context());
    if (await isLoggedIn(page)) return page;
    await page.waitForTimeout(3000);
  }
  throw new Error('Timed out waiting for manual login in the visible browser.');
}

(async () => {
  fs.mkdirSync(path.dirname(readyFile), { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  if (fs.existsSync(readyFile)) fs.unlinkSync(readyFile);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'msedge',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  globalThis.__hc006Context = context;
  let page = context.pages()[0] || (await context.newPage());

  await openMeny(page);
  if (!(await isLoggedIn(page))) {
    page = process.env.MENY_AUTO_LOGIN === '1'
      ? await loginToMeny(page, context).catch(async () => waitForManualLogin(await activePage(context)))
      : await waitForManualLogin(page);
  }
  await clearCart(page);
  await addProduct(page);
  await openCheckout(page);
  await continueToCheckoutStep2(page);
  await chooseFirstPickupSlot(page);
  await chooseBankCard(page);
  const paymentPage = await proceedToPayment(page, context);

  const completion = {
    cardNumberFilled: false,
    expiryFilled: false,
    cvcFilled: false,
    authenticationAttempted: false,
    authenticationButton: '',
    authenticationFrameUrl: '',
    authenticationSkippedReason: '',
    orderPlaced: false,
    orderNumber: '',
    confirmationObserved: false,
    finalBodySnippet: '',
    submitButton: '',
    finalUrl: paymentPage.url(),
  };

  if (COMPLETE_ORDER) {
    Object.assign(completion, await fillPaymentDetails(paymentPage));
    completion.submitButton = await clickPaymentSubmit(paymentPage);
    Object.assign(completion, await clickAuthenticationStep(paymentPage));
    const orderResult = await extractOrderResult(paymentPage);
    completion.orderNumber = orderResult.orderNumber;
    completion.confirmationObserved = orderResult.confirmationObserved;
    completion.finalUrl = orderResult.url;
    completion.finalBodySnippet = orderResult.bodySnippet;
    completion.orderPlaced = orderResult.confirmationObserved;
    if (!completion.orderPlaced) {
      await writePaymentDebug(paymentPage).catch(() => {});
      await writePageDebug(paymentPage, 'HC-006-final-page-debug.json').catch(() => {});
    }
  }

  fs.writeFileSync(
    readyFile,
    JSON.stringify(
      {
        ready: true,
        at: new Date().toISOString(),
        url: completion.finalUrl || paymentPage.url(),
        completedOrderFlow: COMPLETE_ORDER,
        ...completion,
        note: COMPLETE_ORDER
          ? 'Payment details were entered and final order submission was attempted. Sensitive payment values are not logged.'
          : 'Browser is intentionally left open at the payment step. No card number was filled.',
      },
      null,
      2,
    ),
    'utf8',
  );

  await new Promise(() => {});
})().catch(async (error) => {
  fs.mkdirSync(path.dirname(readyFile), { recursive: true });
  // Best effort debug for visible modals and page state, without field values.
  try {
    const context = globalThis.__hc006Context;
    if (context) {
      const page = context.pages()[context.pages().length - 1];
      if (page) {
        await writePageDebug(page);
      }
    }
  } catch {}
  fs.writeFileSync(
    readyFile,
    JSON.stringify({ ready: false, at: new Date().toISOString(), error: error.message }, null, 2),
    'utf8',
  );
  console.error(error);
  process.exit(1);
});
