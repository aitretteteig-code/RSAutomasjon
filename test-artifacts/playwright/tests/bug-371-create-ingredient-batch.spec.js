const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-create-ingredient-batch.json`);
const articleId = process.env.BUG371_INGREDIENT_ARTICLE_ID || '762777';
const lotNumber = process.env.BUG371_LOT_NUMBER || `371${runId.slice(-8)}`;
const dateValue = process.env.BUG371_DATE || '07.05.2026';

async function openNewBatchModal(page) {
  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2200);
  const opened = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const target = [...document.querySelectorAll('button,a,input[type="button"]')]
      .find((el) => /openCreateBatch/i.test(el.getAttribute('ng-click') || '') || /Ny batch/i.test(normalize(el.innerText || el.value || el.getAttribute('title'))));
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  });
  await page.waitForTimeout(1800);
  return opened;
}

test('create ingredient batch with defrosted and heated dates', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  const opened = await openNewBatchModal(page);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-ingredient-batch-modal-before-save.png`), fullPage: false });
  expect(opened).toBeTruthy();

  const fillResult = await page.evaluate(({ lot, date }) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const setValue = (input, value) => {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    };
    const modal = document.querySelector('.modal-content') || document.body;
    const inputs = [...modal.querySelectorAll('input')].filter(visible);
    const textInputs = inputs.filter((input) => (input.getAttribute('type') || 'text') === 'text');

    const lotInput = textInputs.find((input) => normalize(input.closest('.form-group, div')?.innerText).includes('LOT-nummer'));
    if (lotInput) setValue(lotInput, lot);

    for (const input of textInputs) {
      const labelText = normalize(input.closest('.form-group, div')?.innerText);
      if (/Opptint dato|Varmebehandlet dato|Innfrysningsdato|Utløpsdato|Utlopsdato/i.test(labelText)) {
        setValue(input, date);
      }
    }

    return {
      lotSet: lotInput ? lotInput.value : null,
      fields: textInputs.map((input) => ({
        label: normalize(input.closest('.form-group, div')?.innerText),
        value: input.value,
        placeholder: input.getAttribute('placeholder'),
        name: input.getAttribute('name'),
        ngModel: input.getAttribute('ng-model')
      }))
    };
  }, { lot: lotNumber, date: dateValue });

  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-ingredient-batch-modal-filled.png`), fullPage: false });

  const saveClicked = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const button = [...document.querySelectorAll('.modal-content button, .modal-content input[type="button"], .modal-content input[type="submit"], button')]
      .find((el) => /^Lagre$/i.test(normalize(el.innerText || el.value || el.getAttribute('title'))));
    if (!button) return false;
    button.click();
    return true;
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-ingredient-batch-after-save.png`), fullPage: false });

  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    articleId,
    lotNumber,
    dateValue,
    opened,
    fillResult,
    saveClicked,
    bodyTextAfterSave: bodyText.replace(/\s+/g, ' ').trim().slice(0, 5000)
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-CREATE-INGREDIENT-BATCH ${JSON.stringify(result, null, 2)}`);

  expect(saveClicked).toBeTruthy();
  expect(bodyText).toMatch(/Batchen ble lagret|lagret|Ny batch|Batch/i);
});
