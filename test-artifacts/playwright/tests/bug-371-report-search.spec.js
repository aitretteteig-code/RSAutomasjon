const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-report-search.json`);

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

test('find report 371 and inspect parameters', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });

  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

  await page.goto('/retailsuite/store/#/report/list', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const searchInput = page.locator('input[placeholder*="ID"]:visible, input[placeholder*="navn"]:visible').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill('371');
  await page.waitForTimeout(500);
  const searchButton = page.getByRole('button', { name: /^Søk$/ }).first();
  if (await searchButton.isVisible().catch(() => false)) {
    await searchButton.click();
  } else {
    await searchInput.press('Enter');
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-report-search-371.png`), fullPage: false });

  const searchResult = await page.evaluate(() => {
    const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('[ng-click*="reportDetails"], .rs-table-row, tbody tr, .table-row')]
      .map((el) => ({
        text: normalizeLocal(el.innerText),
        ngClick: el.getAttribute('ng-click')
      }))
      .filter((item) => item.text);
    return {
      url: location.href,
      bodyText: normalizeLocal(document.body.innerText).slice(0, 7000),
      rows
    };
  });

  const rowClicked = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[ng-click*="reportDetails"], .rs-table-row, tbody tr, .table-row')];
    const row = rows.find((el) => /(^|\s)371(\s|$)/.test((el.innerText || '').replace(/\s+/g, ' ')));
    if (!row) return false;
    row.scrollIntoView({ block: 'center' });
    row.click();
    return true;
  });

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(evidenceDir, `BUG-371-${runId}-report-371-details.png`), fullPage: false });

  const details = await page.evaluate(() => {
    const normalizeLocal = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      bodyText: normalizeLocal(document.body.innerText).slice(0, 9000),
      inputs: [...document.querySelectorAll('input,select,textarea')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: normalizeLocal(el.value || el.getAttribute('placeholder')),
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          ngModel: el.getAttribute('ng-model')
        })),
      buttons: [...document.querySelectorAll('button,a')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        })
        .map((el) => ({
          text: normalizeLocal(el.innerText || el.getAttribute('title')),
          href: el.getAttribute('href'),
          ngClick: el.getAttribute('ng-click')
        }))
        .filter((item) => item.text || item.href || item.ngClick)
        .slice(0, 180)
    };
  });

  const result = {
    runId,
    environment: 'Test',
    store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME,
    rowClicked,
    searchResult,
    details
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`BUG-371-REPORT-SEARCH ${JSON.stringify(result, null, 2)}`);

  expect(details.inputs.some((input) => input.text === '371')).toBeTruthy();
});
