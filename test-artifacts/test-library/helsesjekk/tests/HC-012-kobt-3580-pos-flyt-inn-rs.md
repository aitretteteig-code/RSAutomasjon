# HC-012 POS og flyt inn til RS

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3580 - https://norgesgruppen.atlassian.net/browse/KOBT-3580
Area: POS / Lagerbevegelser
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at salg gjort i POS flyter inn til lagerbevegelser i RS Store.

## Preconditions

- Tilgang til POS.
- Tilgang til RS Store.

## Test Data

- Vare: Avklares ved execution.
- Salg: Ett ordinært POS-salg.

## Steps

1. Gjør et salg i POS.
   Expected: Salget fullføres og kvittering opprettes.
2. Verifiser salget i Lagerbevegelser i RS Store.
   Expected: Lagerbevegelse med type Salg er synlig på dagens dato.

## Pass Criteria

Testen passerer nar salget kan spores fra POS til lagerbevegelse med type Salg i RS Store.

## Fail Criteria

Testen feiler hvis salget ikke kommer inn som lagerbevegelse i RS Store.

## Blockers / Risks

- Krever fungerende POS-integrasjon.

## Notes

Ingen execution er utfort ved import.
