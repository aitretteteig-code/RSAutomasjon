# REG-075 Varetelling - Test av importert tidligere sekvens

Set: Regresjon
Default environment: Test
Source reference: KOBT-5254 - https://norgesgruppen.atlassian.net/browse/KOBT-5254
Area: Varetelling
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere import av tidligere varetellingssekvens.

## Preconditions

- Tilgang varetelling/import i RS.

## Test Data

- Tidligere sekvens.

## Steps

1. Importer tidligere varetellingssekvens.
   Expected: Sekvens importeres.
2. Verifiser at sekvens kan brukes eller vises korrekt.
   Expected: Importert sekvens er tilgjengelig og korrekt.

## Pass Criteria

Testen passerer nar tidligere sekvens importeres og kan verifiseres.

## Fail Criteria

Testen feiler hvis import feiler eller sekvensen ikke kan brukes.

## Blockers / Risks

- Jira mangler detaljerte steg.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5254 2026-05-07. Ingen execution er utfort ved import.