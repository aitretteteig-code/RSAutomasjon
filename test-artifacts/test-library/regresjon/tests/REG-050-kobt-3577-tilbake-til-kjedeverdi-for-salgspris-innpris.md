# REG-050 Tilbake til kjedeverdi for Salgspris / innpris i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3577 - https://norgesgruppen.atlassian.net/browse/KOBT-3577
Area: Pris
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere tilbake til kjedeverdi for salgspris og innpris.

## Preconditions

- Bruker med riktige RS-rettigheter.
- Vare med lokal innpris eller salgspris.

## Test Data

- Vare med lokal pris og kjent sentral kjedeverdi.

## Steps

1. Åpne vare med lokal inn-/utpris og se sentral pris.
   Expected: Sentral kjedeverdi er synlig.
2. Endre lokal pris.
   Expected: Lokal pris lagres.
3. Velg tilbake til kjedeverdi.
   Expected: Sentral verdi gjenopprettes.

## Pass Criteria

Testen passerer nar sentral verdi vises og kan gjenopprettes.

## Fail Criteria

Testen feiler hvis kjedeverdi ikke vises eller ikke kan settes tilbake.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3577 2026-05-07. Ingen execution er utfort ved import.