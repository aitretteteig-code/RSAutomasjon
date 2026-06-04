# REG-032 Endre innpris i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3434 - https://norgesgruppen.atlassian.net/browse/KOBT-3434
Area: Pris
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Endre lokal innpris i RS og validere i kassedatabase.

## Preconditions

- Vare skal ikke være butikkopprettet.
- Tilgang til RS og kassedatabase/verifikasjon.

## Test Data

- Vare med kommentar B under sortimentsdetaljer.
- Ny innkjøpspris med periode maks 29 dager.

## Steps

1. Søk opp aktuell vare i RS.
   Expected: Varen finnes og kan redigeres.
2. Rediger priser og sett ny innkjøpspris med gyldig periode.
   Expected: Det er ikke mulig å sette innkjøpspris lengre enn 29 dager.
3. Lagre og verifiser pris/periode.
   Expected: Ny innkjøpspris og periode er lagret.
4. Verifiser i kassedatabase.
   Expected: Innpris er endret i kassedatabase.

## Pass Criteria

Testen passerer nar innpris lagres med riktig periode og oppdateres i kassedatabase.

## Fail Criteria

Testen feiler hvis innpris ikke lagres, periodevalidering feiler eller database ikke oppdateres.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3434 2026-05-07. Ingen execution er utfort ved import.