# Instruction for next Codex chat

Purpose: Read this file first when a new chat starts in this workspace. It gives the next Codex session enough context to continue RetailSuite testing without rediscovering the setup.

Workspace:
`C:\Users\antret\OneDrive - NorgesGruppen\Dokumenter\New project 3`

Last updated: 2026-05-20

## User Preferences

- Speak Norwegian with the user.
- Act as testleder/coordinator.
- Keep the user informed, but do not overload them with internal details.
- When the user asks to execute a test, do the work end to end when possible.
- If something requires manual action from the user, explain exactly who to contact and what to write.
- Do not store passwords, tokens, cookies, or session data in files, reports, screenshots, or summaries.
- Default to Test environment unless the user explicitly says Stage or another environment.
- Default known store is MENY JESSHEIM when the test or user asks for it.

## Main Goal

We are building a local RetailSuite test management setup because Xray Test Execution access is not available.

The local setup should support:

- Helsesjekk tests.
- Regresjon tests.
- Test documentation imported/summarized from Jira via Atlassian Rovo.
- Browser execution through Playwright/Edge.
- Local execution records, evidence, and reports.
- Manual handoff steps when POS, MobileAccess, server checks, email, Teams, or other systems cannot be automated.

## Important Files

Start here:

- `instruction.md` - this file.
- `test-artifacts/README.md` - local test management overview.
- `test-artifacts/agents.md` - agent model and file ownership.
- `test-artifacts/agents/shared-test-memory.md` - reusable RS navigation and learned testing knowledge.

Agent files:

- `test-artifacts/agents/coordinator/agent.md`
- `test-artifacts/agents/reporting-agent/agent.md`
- `test-artifacts/agents/browser-test-agent/agent.md`

Test library:

- `test-artifacts/test-library/helsesjekk/test-set.md`
- `test-artifacts/test-library/helsesjekk/tests/`
- `test-artifacts/test-library/regresjon/test-set.md`
- `test-artifacts/test-library/regresjon/tests/`

Execution and evidence:

- `test-artifacts/executions/`
- `test-artifacts/evidence/`
- `test-artifacts/reports/`
- `test-artifacts/investigations/`

Playwright:

- `package.json`
- `playwright.config.js`
- `test-artifacts/playwright/tests/`
- `test-artifacts/playwright/helpers/agent-test.js` - shared Playwright base that enables Browser Test Agent diagnosis for every spec.
- Local Node can be under `.tools/node/`; use `.tools\node\npx.cmd` if `npx` is not on PATH.

## Agent Model

The user wants multiple agents, but all coordination goes through testleder.

Roles:

- Coordinator/Testleder: owns direction, asks clarifying questions, routes work, reviews outputs, gives final answer to user.
- Reporting Agent: reads Jira/Rovo, summarizes scenarios, creates good test steps, updates local test library, creates reports.
- Browser Test Agent: executes steps in RS through browser/Playwright and captures evidence.

Rules:

- Agents should not talk directly to each other.
- Browser findings are passed back to Coordinator, then Coordinator passes relevant parts to Reporting Agent.
- Coordinator should challenge weak agent outputs and tell the user if the agents did not deliver good enough work.
- If no actual subagents are available in a new session, still follow this model manually.

## Jira And Rovo

Atlassian Rovo can be used to fetch Jira/Confluence test content.

Use Jira/Rovo for:

- Reading test scenarios.
- Reading acceptance criteria and comments.
- Turning Jira tests into local test definitions.
- Adding comments if the user asks and tool access allows it.

Do not depend on Xray Test Execution.

Current rule:

- Local files are the execution source of truth.
- Do not mark Xray/Jira executions Passed/Failed unless writable execution access is confirmed and the user explicitly asks for that publishing step.

Jira/test IDs that came up:

- Helsesjekk source tests included: KOBT-5331, KOBT-6117, KOBT-6183, KOBT-3580, KOBT-3581, KOBT-3582, KOBT-3400, KOBT-3401, KOBT-3399, KOBT-3417, KOBT-3418, KOBT-3404, KOBT-3583, KOBT-3421, KOBT-3423, KOBT-3520, KOBT-3521, KOBT-3584, KOBT-3392.
- Regression source test set: KOBT-5437.
- Tests executed/discussed: KOBT-3577, KOBT-3400, KOBT-3585, KOBT-6373, HC-001, HC-002, REG-31.

## Browser And Automation

Earlier attempts used the integrated browser plugin, but the practical setup moved to local Edge and Playwright.

Preferred execution:

- Use Playwright with Edge for repeatable RS tests.
- New Playwright specs must import `test` and `expect` from `../helpers/agent-test`, not directly from `@playwright/test`.
- Existing specs have been migrated to `agent-test`, so portal runs automatically emit Browser Test Agent diagnosis and a readable agent report for both PASS and FAIL.
- Portal runs support cooperative Pause/Fortsett through `test-artifacts/runtime/pause-current.json`; Playwright stays alive and continues at the next safe checkpoint.
- Portal suite runs can execute multiple spec files in parallel with Playwright workers. Default limit is `PORTAL_MAX_PARALLEL_TESTS=2`; keep mutating RetailSuite flows conservative because they share user/store/test data.
- Use headed mode when the user wants to see the test.
- Use headless/hidden mode when the user does not need to watch.
- Keep to one controlled browser/tab unless the user asks otherwise.
- Capture screenshots and JSON evidence under `test-artifacts/evidence/`.

Useful command pattern:

```powershell
$env:PATH = (Resolve-Path '.\.tools\node').Path + ';' + $env:PATH
.\.tools\node\npx.cmd playwright test <spec-path> --project=edge
```

For visible execution:

```powershell
.\.tools\node\npx.cmd playwright test <spec-path> --headed --project=edge
```

Note: PowerShell profile may print an `oh-my-posh` error. It is noise and can normally be ignored.

## RetailSuite Environment

Default:

- Environment: Test
- Known host: `rsbutikk-blue.test.ngdata.no`
- Store often used: MENY JESSHEIM

Login:

- The user has supplied credentials during the conversation, but do not write plaintext secrets into repo files.
- RS and Meny Preprod credentials may be stored in the local Windows DPAPI store via `scripts\secure-rs-credentials.ps1`.
- Set credentials as environment variables only for temporary one-run overrides.
- Do not include credentials in screenshots or artifacts.

Store context:

- Top bar can show MENY JESSHEIM even if internal store context is not fully selected.
- If article search gives no results for known articles, reselect MENY JESSHEIM from the store/user dropdown and retry.

## Manual Systems

Some tests cannot be fully automated from RS Store alone.

Manual/external dependencies mentioned:

- POS
- MobileAccess
- Server checks
- Representative Console
- Email or Teams follow-up
- PRMS sperremelding

When this happens:

- Split the test into automated and manual checkpoints.
- Tell the user exactly what they need to do.
- Provide a ready-to-send Norwegian email/Teams draft when communication is needed.
- Continue the automated part after the user confirms the manual checkpoint.

POS:

- We do not currently have reliable direct automation for the POS/Representative Console UI.
- For POS sale verification, ask the user to perform the POS step and report the result, then record it in the execution.
- Example: REG-31 used user feedback that price in POS was `43,90`.

## Learned Test Knowledge

Detailed reusable navigation is stored in:

- `test-artifacts/agents/shared-test-memory.md`

Important highlights:

### HC-001 / Sperremelding

- HC-001 depends on PRMS precondition KOBT-4051.
- Test environment maps to `Bla/systest`.
- Stage maps to `Rod/QA`.
- Jira-listed PRMS contact: Geir Ottersen Nipe.
- Known email from Jira lookup: `geir.ottersen.nipe@norgesgruppen.no`.
- User confirmed Geir had sent sperremelding in one run.
- Continue by verifying RS Connector, RS Store, and POS block/release.

### HC-002 / Recipe And Production

- Navigation: RS Store -> Varer -> search article/recipe -> Fullstendige varedetaljer -> Oppskrift -> Rediger.
- Useful recipe/article examples:
  - `514687 - BROKKOLISALAT M/BACON PR STK`
  - `757709 - LAM YTREFILET MARINERT PR KG`
  - Temporary ingredient used safely: `966897 - ALI FROKOSTKAFFE FILTERMALT 175G`
- Safe recipe edit pattern: add temporary ingredient -> verify -> remove same ingredient -> verify original state -> save from `Prissetting`.
- Production flow: article details -> `Start ny produksjon` -> `Plukker ingredienser` -> `Detaljer` -> `Plukk` -> `Produksjon` -> `Fullfor`.
- Production tab selectors are documented in shared memory.

### Price Change

- Working route: RS Store -> Varer -> article -> full details -> `Priser` -> `Rediger`.
- Edit `Salgspris`, blur/tab out, wait for `Lagre` active, save.
- Confirmation toast can say the change may take a few minutes to take effect.
- Verify by reopening article details or checking active price.
- Known successful article:
  - `966897 - ALI FROKOSTKAFFE FILTERMALT 175G`
  - Changed from `39,90` to `41,90`, then to `43,90`, then changed back during earlier testing.

## Bug Investigation: Report 371 / 372 Batch Dates

User asked to investigate a long-standing defect:

- If ingredients originate from a batch with Defrosted Date and Heated Date, those dates are missing from traceability output.
- If dates are entered directly in production screen, they are shown.

Important correction from user:

- Report 371 is not found through ordinary report list.
- It is opened from article/batch flow:
  - Create batch in production.
  - Batch becomes available under `Batcher`.
  - On the item/batch, choose `Vis sporing`.
  - This generates the traceability report.

Created test data:

- Ingredient article: `762777 - BROKKOLISALAT M/BACON PR KG`
- Ingredient batch: LOT `37107100011`, batchId `16925`
- Finished production article: `514687 - BROKKOLISALAT M/BACON PR STK`
- Production: `19605`
- Finished production batch: LOT `2026050702`, batchId `16926`

Key finding:

- Report 371 for the ingredient batch shows `Defrosted Date` and `Heated Date`.
- UI route from the finished production batch opens report 372 because the batch has `productionId`.
- Report 372 shows the ingredient batch and has columns `Defrosted Date` / `Heated Date`, but the values are blank on the ingredient row.
- This reproduces the practical defect pattern in the production traceability report.

Investigation file:

- `test-artifacts/investigations/RS-report-371-opptint-varmebehandlet-dato-20260507.md`

Evidence examples:

- `test-artifacts/evidence/bug-371-report-dates/BUG-371-20260507101436-execute-report-371-after-16925.png`
- `test-artifacts/evidence/bug-371-report-dates/BUG-371-20260507101801-execute-report-371-after-16926.png`

Next useful verification:

- Create one more production where dates are entered directly on the production screen and compare the output with the batch-originated case.

## File Structure Lessons

The user asked to clean up and stop depending on unavailable Xray execution access.

Current direction:

- Keep helsesjekk and regresjon separated.
- Create every test locally with clear steps and source Jira link/key.
- Store each execution under `test-artifacts/executions/`.
- Store screenshots/raw output under `test-artifacts/evidence/`.
- Store reusable learning in `test-artifacts/agents/shared-test-memory.md`, not scattered in execution logs.
- Remove unnecessary files only when clearly safe; do not delete evidence or test definitions without user confirmation.

## How To Handle New Test Requests

When user says for example "gjennomfor HC-002" or "kjor REG-31":

1. Read this `instruction.md`.
2. Read `test-artifacts/agents/shared-test-memory.md`.
3. Find the local test definition in helsesjekk or regresjon.
4. If test originates from Jira and local definition is missing/incomplete, use Rovo/Jira to fetch and summarize it.
5. Convert scenario into concrete test steps.
6. Decide what can be automated and what must be manual.
7. Run browser/Playwright part.
8. Ask user for manual checkpoint results when needed.
9. Save execution record with status `PASS`, `FAIL`, or `BLOCKED`.
10. Add evidence paths.
11. Update shared memory only with stable, reusable navigation knowledge.
12. Give the user a concise result summary.

## Status Rules

- `PASS`: Expected behavior verified.
- `FAIL`: Confirmed mismatch against expected behavior.
- `BLOCKED`: Cannot complete due to access, environment, unclear data, external system, manual dependency, or unavailable integration.
- `NOT RUN`: Test exists but has not been executed.

Do not call a test Passed if a required manual POS/MobileAccess/server step is missing.

## Things To Remember Next Time

- The user values speed gained from remembering navigation and test patterns.
- Keep learned RetailSuite navigation in shared memory.
- Do not over-search RS when a known path exists.
- For tests involving external systems, make a clean automated/manual split.
- When RS navigation or table parsing fails, do a live Playwright inspection early instead of guessing. Log current URL, visible menu links/hrefs, buttons, table headers, row/cell values, and screenshot.
- If the user says "grip inn", actively inspect/run the system instead of continuing with abstract explanation.
- RS reports are no longer used as verification points for helsesjekk flows unless the user explicitly asks for a report-specific test.
- HC-012 verification is in RS Store -> Lager -> Lagerbevegelser, not Salg/Kvittering and not RS reports.
- HC-012 route/link: `#/stockadjustments/list`; prefer clicking `a[href="#/stockadjustments/list"]`.
- HC-012 table is `div.rs-table`, not normal `table/tr/td`; parse `.rs-table .row:not(.rs-table-header)` and row children as cells.
- HC-012 pass condition: a row in Lagerbevegelser with `TRANSAKSJONSDATO` on today's date and `TYPE` exactly `Salg`.
- HC-006 Pick & Collect orders with future pickup windows can land in `#/pickAndCollect/futureOrders` / Fremtidige bestillinger before they move to plukk/henting/archive.
- Do not try to force Xray Test Execution until access exists.
- Use local evidence and reports as the truth.
- When running Playwright, prefer Edge project because the configured project is `edge`.
- If `npx` fails, use `.tools\node\npx.cmd`.
- Keep plaintext credentials out of files.
- If in doubt about Test vs Stage, default to Test and ask only if the user has introduced ambiguity.
