# REG-047 1171 Varer til plukk pr avdeling

Set: Regresjon
Default environment: Test
Source reference: KOBT-3544 - https://norgesgruppen.atlassian.net/browse/KOBT-3544
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 1171 Varer til plukk pr avdeling.

## Preconditions

- Pick&Collect-testdata i RS eller preprod Meny.no.

## Test Data

- Ordre med varer fra forskjellige avdelinger.

## Steps

1. Åpne rapport 1171.
   Expected: Rapporten åpnes.
2. Kontroller fordeling av varer per avdeling.
   Expected: Varer vises fordelt per avdeling.

## Pass Criteria

Testen passerer nar varer vises korrekt per avdeling.

## Fail Criteria

Testen feiler hvis avdelinger ikke separeres eller rapporten viser feil.

## Blockers / Risks

- Aktiv defect BUT-2240: avdelinger er ikke separert i rapport 1171.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3544 2026-05-07. Ingen execution er utfort ved import.