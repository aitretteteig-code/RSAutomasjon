const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, DEFAULT_STORE_URL, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-trace-function-inspect.json`);
const finishedLot = process.env.BUG371_FINISHED_LOT || '2026050702';

test('inspect Angular viewBatchTrace implementation and batch object', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`${DEFAULT_STORE_URL}#/batches/batch/list/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await page.locator('input[name="batch"]:visible').first().fill(finishedLot);
  await page.waitForTimeout(2500);

  const result = await page.evaluate((lot) => {
    const safe = (value) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_error) {
        return String(value);
      }
    };
    const angularRef = window.angular;
    const target = [...document.querySelectorAll('[ng-click*="viewBatchTrace"], [ng-click*="openBatch"]')]
      .find((el) => (el.innerText || '').includes(lot) || (el.getAttribute('ng-click') || '').includes('viewBatchTrace'));
    const scopes = [];
    for (const el of [...document.querySelectorAll('[ng-click*="viewBatchTrace"], [ng-click*="openBatch"], .rs-table-row')]) {
      try {
        let scope = angularRef.element(el).scope();
        const chain = [];
        let current = scope;
        for (let depth = 0; current && depth < 10; depth += 1) {
          chain.push({
            depth,
            keys: Object.keys(current).filter((key) => /batch|trace|report|Batch|Trace|Report/i.test(key)).slice(0, 60),
            hasViewBatchTrace: !!current.viewBatchTrace,
            hasBatch: !!current.batch,
            hasBatches: Array.isArray(current.batches)
          });
          if (current.viewBatchTrace || current.batch || Array.isArray(current.batches)) {
            scope = current;
            break;
          }
          current = current.$parent;
        }
        scopes.push({
          text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 500),
          ngClick: el.getAttribute('ng-click'),
          chain,
          hasViewBatchTrace: !!scope?.viewBatchTrace,
          viewBatchTrace: scope?.viewBatchTrace ? String(scope.viewBatchTrace).slice(0, 4000) : null,
          batch: scope?.batch ? safe(scope.batch) : null,
          batchesLength: Array.isArray(scope?.batches) ? scope.batches.length : null,
          firstBatch: Array.isArray(scope?.batches) ? safe(scope.batches[0]) : null
        });
      } catch (error) {
        scopes.push({ error: String(error && error.message ? error.message : error) });
      }
    }
    return {
      url: location.href,
      targetText: target ? (target.innerText || target.value || '').replace(/\s+/g, ' ').trim() : null,
      scopes
    };
  }, finishedLot);

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, finishedLot, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-TRACE-FUNCTION ${JSON.stringify(result, null, 2)}`);
  expect(result.scopes.length).toBeGreaterThan(0);
});
