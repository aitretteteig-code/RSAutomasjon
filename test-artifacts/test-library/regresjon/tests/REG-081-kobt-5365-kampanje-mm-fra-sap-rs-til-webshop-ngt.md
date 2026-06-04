# REG-081 Kampanje/MM fra SAP / RS til WebShop (NGT)

Set: Regresjon
Default environment: Test
Source reference: KOBT-5365 - https://norgesgruppen.atlassian.net/browse/KOBT-5365
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at sentrale kampanjer og MixMatch flyter fra SAP/RS til WebShop.

## Preconditions

- Testmiljø Test.
- SAP/RS/WebShop-integrasjon tilgjengelig.

## Test Data

- Kampanje/MM-data fra SAP.

## Steps

1. Send sentral kampanje eller MixMatch fra SAP/RS mot WebShop.
   Expected: Data sendes fra kilde.
2. Verifiser mottak i WebShop.
   Expected: Kampanje/MM mottas og vises korrekt i WebShop.

## Pass Criteria

Testen passerer nar kampanje/MM er korrekt tilgjengelig i WebShop.

## Fail Criteria

Testen feiler hvis data ikke mottas eller vises feil i WebShop.

## Blockers / Risks

- Mangler detaljerte Jira-steg/expected/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5365 2026-05-07. Ingen execution er utfort ved import.