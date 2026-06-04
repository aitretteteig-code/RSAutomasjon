# REG-034 Verifisere salg i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3440 - https://norgesgruppen.atlassian.net/browse/KOBT-3440
Area: Salg
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at salg fra POS er synlig i RS Store.

## Preconditions

- Tilgang til POS og RS Store.

## Test Data

- POS-salg/kvittering.

## Steps

1. Gjennomfør eller finn et salg i POS.
   Expected: Salget har kvittering/referanse.
2. Søk opp/verifiser salget i RS Store.
   Expected: Salget er synlig i RS.

## Pass Criteria

Testen passerer nar POS-salget er synlig og korrekt i RS Store.

## Fail Criteria

Testen feiler hvis salg ikke vises eller vises med feil data.

## Blockers / Risks

- Tidligere defects er lukket; ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3440 2026-05-07. Ingen execution er utfort ved import.