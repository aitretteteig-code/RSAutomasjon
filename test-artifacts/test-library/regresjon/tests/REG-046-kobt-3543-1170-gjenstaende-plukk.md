# REG-046 1170 Gjenstående plukk

Set: Regresjon
Default environment: Test
Source reference: KOBT-3543 - https://norgesgruppen.atlassian.net/browse/KOBT-3543
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 1170 Gjenstående plukk.

## Preconditions

- Pick&Collect-testdata i RS eller preprod Meny.no.

## Test Data

- Ordre hvor noen varer er plukket, men ordren ikke er ferdigplukket.

## Steps

1. Plukk hele ordren på én vare og la resterende varer stå igjen.
   Expected: Ordren har gjenstående plukk.
2. Åpne rapport 1170.
   Expected: Rapporten viser gjenstående plukk og korrekt layout.

## Pass Criteria

Testen passerer nar gjenstående plukk vises korrekt.

## Fail Criteria

Testen feiler hvis rapporten ikke viser utestående varer korrekt.

## Blockers / Risks

- Krever egnet uferdig plukkordre.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3543 2026-05-07. Ingen execution er utfort ved import.