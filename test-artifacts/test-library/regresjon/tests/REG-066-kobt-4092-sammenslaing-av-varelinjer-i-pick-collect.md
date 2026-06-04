# REG-066 Sammenslåing av varelinjer i Pick&Collect

Set: Regresjon
Default environment: Test
Source reference: KOBT-4092 - https://norgesgruppen.atlassian.net/browse/KOBT-4092
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere sammenslåing av varelinjer i Pick&Collect.

## Preconditions

- Webordre i PREPROD Meny.no.

## Test Data

- Ordre med 1 vare.
- Ordre med 10 av samme vare.
- Ordre med store antall av flere varer.

## Steps

1. Opprett/finn testordrene i PREPROD Meny.no.
   Expected: Ordrene er tilgjengelige i RS.
2. Plukk ordrene i RS Store.
   Expected: Plukk kan gjennomføres.
3. Verifiser POS og kvittering.
   Expected: Varelinjer er slått sammen og vises som forventet.

## Pass Criteria

Testen passerer nar POS/kvittering viser sammenslåtte varelinjer.

## Fail Criteria

Testen feiler hvis like varelinjer ikke slås sammen korrekt.

## Blockers / Risks

- Krever egnet webshop-testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4092 2026-05-07. Ingen execution er utfort ved import.