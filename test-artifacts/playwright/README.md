# Playwright Runner

This folder contains the local Playwright setup for RetailSuite browser tests.

## Principles

- Use Playwright instead of attaching to the user's normal Edge session.
- Use installed Microsoft Edge via Playwright channel `msedge`.
- Keep credentials out of files, reports, screenshots, and logs.
- Save test output under `test-artifacts/evidence/playwright-results` and HTML reports under `test-artifacts/evidence/playwright-report`.
- Import `test` and `expect` from `../helpers/agent-test` in every spec. This enables Browser Test Agent diagnosis and agent reports automatically for both passed and failed portal runs.

New spec template:

```javascript
const { test, expect } = require('../helpers/agent-test');
```

## Credentials

Credentials must stay out of source files, reports, screenshots, and logs. Local runs can use either temporary environment variables or the Windows DPAPI-backed store handled by `scripts/secure-rs-credentials.ps1`.

RS Store can be saved locally with:

```powershell
"<password>" | powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\secure-rs-credentials.ps1 -Action Save -UserName "<username>" -PasswordFromStdin
```

Meny Preprod / Pick & Collect can be saved locally with:

```powershell
@'
{
  "preprodUrl": "https://menyweb.trumffrontend.systest.trumf.cloud/",
  "phone": "<phone>",
  "password": "<password>",
  "otpCode": "<mobilkode>",
  "card": "<bankkort>"
}
'@ | powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\secure-rs-credentials.ps1 -Action SaveMeny -FromStdinJson
```

Temporary overrides for one terminal/session:

```powershell
$env:RS_TEST_USERNAME = "<username>"
$env:RS_TEST_PASSWORD = "<password>"
$env:MENY_PREPROD_URL = "https://menyweb.trumffrontend.systest.trumf.cloud/"
$env:MENY_TEST_PHONE = "<phone>"
$env:MENY_TEST_PASSWORD = "<password>"
$env:MENY_TEST_OTP_CODE = "<mobilkode>"
$env:MENY_TEST_CARD = "<bankkort>"
```

Optional:

```powershell
$env:RS_STORE_NAME = "MENY JESSHEIM"
$env:RS_STORE_URL = "https://rsbutikk-blue.test.ngdata.no/retailsuite/store/"
$env:RS_LOGIN_URL = "<full IdentityServer login URL if a test requires it>"
$env:PW_HEADLESS = "1"
```

## Commands

Install/update the local runner:

```powershell
.\test-artifacts\scripts\setup-playwright.ps1
```

Run the login/store smoke test visibly:

```powershell
.\test-artifacts\scripts\pw.ps1 test test-artifacts\playwright\tests\rs-login.spec.js --headed
```

Open the HTML report after a run:

```powershell
.\test-artifacts\scripts\pw.ps1 show-report test-artifacts\evidence\playwright-report
```

## Portal Pause / Resume

Portal runs support cooperative pause/resume. The dashboard writes pause state to `test-artifacts/runtime/pause-current.json`, and `helpers/agent-test.js` installs Playwright pause hooks for every spec.

- `Pause test` keeps the Playwright process and browser alive.
- `Fortsett test` removes the pause state and lets the test continue at the next safe checkpoint.
- `Stopp` still kills the Playwright process and records the run as stopped.

Pause is checked around common Playwright page, locator, keyboard, and mouse operations. If a test is inside one long browser action, it pauses at the next checkpoint rather than freezing mid-click.

## Parallel Portal Runs

When the portal starts a suite with multiple spec files, it can run more than one spec file at the same time through Playwright workers.

- Default portal limit: `PORTAL_MAX_PARALLEL_TESTS=2`.
- The runner passes `--workers=<limit>` only when a run contains more than one spec.
- You can override the default for a session with `PORTAL_MAX_PARALLEL_TESTS`, but keep mutating RetailSuite flows conservative because tests share environment, user, store, and data.
- Single-spec runs still use one worker.

## Current Known Limitation

The Codex/PowerShell session may still see Codex's internal `node.exe` first on PATH until the app/terminal is restarted. The wrapper `test-artifacts/scripts/pw.ps1` therefore prefers `C:\Program Files\nodejs\node.exe` directly when it exists, with `.tools/node` as fallback.

Resolved setup issue:

- Fresh Playwright profiles stop at `Velg butikk` after login.
- The helper now confirms the selected store before checking internal RS store context.
- The login/store smoke test passes for `MENY JESSHEIM`.
