# REG-079 Kansellering av ordre i RS Pick&Collect

Set: Regresjon
Default environment: Test
Source reference: KOBT-5359 - https://norgesgruppen.atlassian.net/browse/KOBT-5359
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Kansellere ordre i RS Pick&Collect.

## Preconditions

- Pick&Collect-ordre må finnes.

## Test Data

- Ordre som kan kanselleres.

## Steps

1. Åpne ordre i RS Pick&Collect.
   Expected: Ordren er tilgjengelig.
2. Kanseller ordren.
   Expected: Ordren får kansellert status.
3. Verifiser videre behandling.
   Expected: Ordren går ikke videre i plukk/betaling.

## Pass Criteria

Testen passerer nar ordre kanselleres og ikke behandles videre.

## Fail Criteria

Testen feiler hvis kansellering ikke lagres eller ordren fortsatt behandles.

## Blockers / Risks

- Jira mangler description/steps/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5359 2026-05-07. Ingen execution er utfort ved import.