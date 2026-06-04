# RetailSuite Local Test Management

This folder is the local source of truth for RetailSuite testing.

Xray Test Execution access is not currently available, so tests are managed here instead.

## Structure

| Path | Purpose |
| --- | --- |
| `agents/` | Agent instructions and shared memory |
| `test-library/` | Test definitions and test sets |
| `test-library/helsesjekk/` | Health check tests |
| `test-library/regresjon/` | Regression tests |
| `executions/` | One execution record per test run |
| `evidence/` | Screenshots and raw evidence |
| `reports/` | Summaries and sign-off |
| `templates/` | Reusable templates |

## Status Model

- `NOT RUN`: Test is defined but not executed.
- `PASS`: Expected behavior verified.
- `FAIL`: Confirmed mismatch against expected result.
- `BLOCKED`: Could not complete due to access, data, environment, external integration, or unclear steps.

## Environment Rule

Default environment is Test.

Use Stage only when the user explicitly says Stage.
