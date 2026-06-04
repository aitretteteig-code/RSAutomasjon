# REG-013 Beste pris logikk - mixmatch

Set: Regresjon
Default environment: Test
Source reference: KOBT-2967 - https://norgesgruppen.atlassian.net/browse/KOBT-2967
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Needs detail, Jira lacks description

## Objective

Validere beste pris-logikk for mixmatch.

## Preconditions

- Testmiljo og Pick&Collect.
- Detaljert testdata ma avklares.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Avklar mixmatch-oppsett og testordre for execution.
   Expected: Testdata og forventet prisregel er kjent.
2. Gjennomfor Pick&Collect-plukk for mixmatch-varene.
   Expected: Mixmatch-pris handteres korrekt etter beste pris-logikk.

## Pass Criteria

Testen passerer nar mixmatch-prising er korrekt i Pick&Collect/kvittering.

## Fail Criteria

Testen feiler hvis mixmatch ikke beregnes eller feil pris vinner.

## Blockers / Risks

- Mangler description, konkrete steg og testdata i Jira.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2967 2026-05-07. Ingen execution er utfort ved import.