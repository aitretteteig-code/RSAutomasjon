# HC-013 Flyt fra RS til periferi

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3581 - https://norgesgruppen.atlassian.net/browse/KOBT-3581
Area: Pris / Periferi
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at salgsprisendring på vektvare i RS Store oppdateres i POS og på vekt.

## Preconditions

- Tilgang til RS Store.
- Tilgang til POS.
- Tilgang til vekt/periferi.
- Egnet vektvare finnes.

## Test Data

- Vektvare: Avklares ved execution.
- Ny salgspris: Avklares ved execution.

## Steps

1. Playwright gjør en salgsprisendring på en vektvare i RS Store.
   Expected: Salgsprisendringen lagres og verifiseres automatisk via RS Store.
2. Verifiser at POS er oppdatert med ny pris.
   Expected: POS viser ny pris.
3. Verifiser at vekt er oppdatert med ny pris.
   Expected: Vekt viser ny pris.

## Pass Criteria

Testen passerer nar prisendringen er synlig både i POS og på vekt.

## Fail Criteria

Testen feiler hvis pris ikke oppdateres i POS eller på vekt.

## Blockers / Risks

- Krever fungerende POS- og vektintegrasjon.

## Notes

Automation note 2026-05-20: RS Store-handlingen er automatisert i `test-artifacts/playwright/tests/hc-013-rs-to-periphery.spec.js`. POS og vekt/periferi krever fortsatt ekstern verifisering hvis full ende-til-ende skal bekreftes.
