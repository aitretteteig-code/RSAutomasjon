# REG-025 Opprette Lokal kampanje i RS Store (Innpris)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3414 - https://norgesgruppen.atlassian.net/browse/KOBT-3414
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette lokal innkjøpskampanje i RS Store og validere varekort/POS/rapport.

## Preconditions

- Tilgang til RS Store, POS og kampanjerapport.

## Test Data

- Vare for lokal innpriskampanje.

## Steps

1. Opprett lokal innkjøpskampanje i RS Store.
   Expected: Kampanjen lagres.
2. Verifiser varekort.
   Expected: Varekort har kampanjemarkering og kampanje-ID.
3. Gjennomfør salg i POS.
   Expected: Salg kan gjennomføres.
4. Verifiser brutto i kampanjerapport.
   Expected: Brutto vises korrekt.

## Pass Criteria

Testen passerer nar innpriskampanje opprettes og rapport/POS-verifikasjon er korrekt.

## Fail Criteria

Testen feiler hvis kampanje, varekort eller rapportverdi er feil.

## Blockers / Risks

- Åpen defect BUT-5252 kan påvirke rapportvalidering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3414 2026-05-07. Ingen execution er utfort ved import.