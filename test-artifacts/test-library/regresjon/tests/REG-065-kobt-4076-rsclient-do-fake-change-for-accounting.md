# REG-065 RSClient - Do fake change for Accounting

Set: Regresjon
Default environment: Test
Source reference: KOBT-4076 - https://norgesgruppen.atlassian.net/browse/KOBT-4076
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere RSClient fake change for Accounting.

## Preconditions

- Tilgang RS Client og regnskapsflyt.
- Confluence-beskrivelse finnes og må brukes ved execution.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Hent detaljert Confluence-beskrivelse for fake change for Accounting.
   Expected: Execution-steg er avklart.
2. Utfør fake change i RS Client.
   Expected: Regnskapsrelatert endring/flyt trigges korrekt.

## Pass Criteria

Testen passerer nar fake change trigger forventet accounting-flyt.

## Fail Criteria

Testen feiler hvis endringen ikke trigges eller regnskapsflyt er feil.

## Blockers / Risks

- Detaljer ligger primært i Confluence, ikke i Jira-description.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4076 2026-05-07. Ingen execution er utfort ved import.