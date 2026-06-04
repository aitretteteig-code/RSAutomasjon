const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-new-batch-modal-inspect.json`);
const articleId = process.env.BUG371_ARTICLE_ID || '762777';

test('inspect new batch modal fields for date selectors', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  const opened = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const buttons = [...document.querySelectorAll('button,a,input[type="button"]')];
    const createButtons = buttons
      .map((el, index) => ({ el, index, text: normalize(el.innerText || el.value || el.getAttribute('title')), ngClick: el.getAttribute('ng-click') }))
      .filter((item) => /Opprett|Ny batch/i.test(item.text) || /showEdit|create/i.test(item.ngClick || ''));
    const target =
      createButtons.find((item) => /openCreateBatch/i.test(item.ngClick || '')) ||
      createButtons.find((item) => /Ny batch/i.test(item.text)) ||
      createButtons.find((item) => /showEdit/i.test(item.ngClick || '')) ||
      createButtons[0];
    if (!target) return { ok: false, candidates: createButtons.map(({ index, text, ngClick }) => ({ index, text, ngClick })) };
    target.el.scrollIntoView({ block: 'center' });
    target.el.click();
    return { ok: true, clicked: { index: target.index, text: target.text, ngClick: target.ngClick }, candidates: createButtons.map(({ index, text, ngClick }) => ({ index, text, ngClick })) };
  });

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-new-batch-modal-${articleId}.png`), fullPage: false });

  const modal = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const active = document.querySelector('.modal-content') || document.body;
    return {
      bodyText: normalize(active.innerText).slice(0, 12000),
      inputs: [...active.querySelectorAll('input,select,textarea')]
        .filter(visible)
        .map((el, index) => ({
          index,
          text: normalize(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          title: el.getAttribute('title'),
          ngModel: el.getAttribute('ng-model'),
          disabled: el.disabled,
          readOnly: el.readOnly
        })),
      buttons: [...active.querySelectorAll('button,a,input[type="button"],input[type="submit"]')]
        .filter(visible)
        .map((el, index) => ({
          index,
          text: normalize(el.innerText || el.value || el.getAttribute('title')),
          type: el.getAttribute('type'),
          ngClick: el.getAttribute('ng-click'),
          disabled: el.disabled
        }))
    };
  });

  const result = { runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, articleId, opened, modal };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-NEW-BATCH-MODAL ${JSON.stringify(result, null, 2)}`);

  expect(opened.ok).toBeTruthy();
  expect(modal.bodyText).toMatch(/Ny batch|Opptint|Varmebehandlet|LOT/i);
});
