# REG-031 Endre salgspris i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3433 - https://norgesgruppen.atlassian.net/browse/KOBT-3433
Area: Pris
Priority: Normal
Status: PASSED
Documentation status: Ready, based on Jira description

## Objective

Endre lokal salgspris i RS og validere i kasse.

## Preconditions

- Vare skal ikke være butikkopprettet.
- Tilgang til RS og kasse/POS.

## Test Data

- Vare med kommentar B under sortimentsdetaljer.
- Ny salgspris med periode maks 29 dager.

## Steps

1. Søk opp aktuell vare i RS.
   Expected: Varen finnes og kan redigeres.
2. Rediger priser og sett ny salgspris med gyldig periode.
   Expected: Det er ikke mulig å sette salgspris lengre enn 29 dager.
3. Lagre og verifiser pris/periode.
   Expected: Ny salgspris og periode er lagret.
4. Verifiser i kasse.
   Expected: Salgspris er endret i kasse.

## Pass Criteria

Testen passerer nar pris lagres med riktig periode og vises i kasse.

## Fail Criteria

Testen feiler hvis pris ikke lagres, periodevalidering feiler eller kasse ikke oppdateres.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3433 2026-05-07. Ingen execution er utfort ved import.

Execution 2026-05-07: RS Store-delen er utfort med Playwright i Test/MENY JESSHEIM. Vare `966897` ble endret fra `41,90` til `43,90` og verifisert i RS. POS-verifisering ble bekreftet av bruker med pris `43,90`. Testen er PASSED. Se `test-artifacts/executions/REG-031-20260507-092941.md`.
