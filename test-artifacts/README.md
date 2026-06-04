# RetailSuite Local Test Management

This folder holds the local test assets for the RetailSuite test portal.

Xray Test Execution access is not currently available, so test definitions, Playwright specs, and local helper scripts live here instead.

## Structure

| Path | Purpose |
| --- | --- |
| `playwright/` | Playwright specs and shared test helpers |
| `scripts/` | Small PowerShell helpers used by the local Playwright workflow |
| `templates/` | Reusable Markdown templates for local execution notes |
| `test-library/` | Test definitions and grouped test sets |
| `test-library/helsesjekk/` | Health check tests |
| `test-library/regresjon/` | Regression tests |

## Local Generated Content

These paths are still part of the local workflow, but they are generated on the machine and are intentionally not versioned in Git:

- `executions/`
- `evidence/`
- `reports/`
- `runtime/`
- `.browser-profiles/`

## Status Model

- `NOT RUN`: Test is defined but not executed.
- `PASS`: Expected behavior verified.
- `FAIL`: Confirmed mismatch against expected result.
- `BLOCKED`: Could not complete due to access, data, environment, external integration, or unclear steps.

## Environment Rule

Default environment is Test.

Use Stage only when the user explicitly says Stage.
