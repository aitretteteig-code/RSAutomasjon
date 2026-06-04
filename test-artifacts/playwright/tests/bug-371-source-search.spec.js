const { test, expect } = require('../helpers/agent-test');
const fs = require('fs');
const path = require('path');
const { DEFAULT_STORE_NAME, DEFAULT_STORE_URL, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

const runId = process.env.BUG371_RUN_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const evidenceDir = path.resolve('test-artifacts/evidence/bug-371-report-dates');
const resultPath = path.join(evidenceDir, `BUG-371-${runId}-source-search.json`);

test('search loaded scripts for viewBatchTrace implementation', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await loginIfNeeded(page);
  await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);
  await page.goto(`${DEFAULT_STORE_URL}#/batches/batch/list/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);

  const result = await page.evaluate(async () => {
    const scripts = [...document.scripts].map((script) => script.src).filter(Boolean);
    const matches = [];
    for (const src of scripts) {
      try {
        const text = await fetch(src, { credentials: 'include' }).then((response) => response.text());
        const index = text.indexOf('viewBatchTrace');
        const index371 = text.indexOf('BatchTraceability');
        if (index >= 0 || index371 >= 0) {
          matches.push({
            src,
            viewBatchTraceIndex: index,
            batchTraceabilityIndex: index371,
            excerpt: text.slice(Math.max(0, Math.max(index, index371) - 2500), Math.max(index, index371) + 4500)
          });
        }
      } catch (error) {
        matches.push({ src, error: String(error && error.message ? error.message : error) });
      }
    }
    return { scripts, matches };
  });

  fs.writeFileSync(resultPath, JSON.stringify({ runId, environment: 'Test', store: process.env.RS_STORE_NAME || DEFAULT_STORE_NAME, ...result }, null, 2), 'utf8');
  console.log(`BUG-371-SOURCE-SEARCH ${JSON.stringify(result, null, 2)}`);

  expect(result.scripts.length).toBeGreaterThan(0);
});
