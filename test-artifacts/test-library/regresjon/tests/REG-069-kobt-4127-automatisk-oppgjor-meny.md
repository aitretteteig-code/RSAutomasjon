# REG-069 Automatisk oppgjør (Meny)

Set: Regresjon
Default environment: Test
Source reference: KOBT-4127 - https://norgesgruppen.atlassian.net/browse/KOBT-4127
Area: Oppgjør
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere automatisk oppgjør for Meny.

## Preconditions

- Precondition KOBT-4126: gjennomfør POS-salg med kontant.
- Credentials hentes fra godkjent vault og dokumenteres ikke.

## Test Data

- Tilfeldig POS-vare/salg.

## Steps

1. Logg ut av POS etter precondition-salg.
   Expected: POS-sesjon er avsluttet.
2. Logg inn i RS Store og sjekk kassereroppgjør.
   Expected: POS-salget har kommet inn.
3. Vent til neste dag og sjekk oppgjør.
   Expected: Oppgjøret er godkjent automatisk.

## Pass Criteria

Testen passerer nar salg kommer inn og oppgjør godkjennes automatisk neste dag.

## Fail Criteria

Testen feiler hvis salg mangler eller oppgjør ikke godkjennes.

## Blockers / Risks

- Test går over to dager.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4127 2026-05-07. Ingen execution er utfort ved import.