# REG-052 Tilbake til kjedeverdi for Bestillingsalternativ (OA) i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3579 - https://norgesgruppen.atlassian.net/browse/KOBT-3579
Area: Vare
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere tilbake til kjedeverdi for bestillingsalternativ/OA.

## Preconditions

- Bruker med riktige RS-rettigheter.
- Vare med OA avvikende fra kjedenivå.

## Test Data

- Vare med lokalt valgt OA.

## Steps

1. Åpne vare med lokalt OA.
   Expected: Kjedeverdi for OA er synlig.
2. Sett OA tilbake til kjedeverdi.
   Expected: Kjedeverdi gjenopprettes.

## Pass Criteria

Testen passerer nar OA kan settes tilbake til kjedeverdi.

## Fail Criteria

Testen feiler hvis OA-kjedeverdi ikke vises eller ikke kan gjenopprettes.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3579 2026-05-07. Ingen execution er utfort ved import.