# Regresjon Test Definitions

Put one file per detailed test definition here.

Filename pattern:
- `REG-001-short-title.md`

Use:
- `test-artifacts/templates/test-case-template.md`

Current source of imported regression tests:
- `../test-set.md`

Tests imported from Jira test set KOBT-5437 are registered in the regression test set first.
When one of them is selected for execution, Reporting Agent expands the Jira source into a full local test definition here before Browser Test Agent executes it.
