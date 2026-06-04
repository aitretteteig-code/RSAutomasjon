# REG-036 Endring av sentral kampanje fra SAP

Set: Regresjon
Default environment: Test
Source reference: KOBT-3520 - https://norgesgruppen.atlassian.net/browse/KOBT-3520
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Endre sentral kampanje fra SAP og validere i RS/POS.

## Preconditions

- Precondition KOBT-4048: aktiv kampanje finnes og kan endres.
- Tilgang til SAP arbeidsbenk, RS Connector, RS Store og POS.

## Test Data

- Eksisterende sentral kampanje og artikler som kan legges til/fjernes.

## Steps

1. Endre kampanje i SAP arbeidsbenk ved å legge til/fjerne artikler.
   Expected: Endringen sendes fra SAP.
2. Verifiser mottak i RS Connector.
   Expected: Endret kampanje mottas.
3. Verifiser oppdatert kampanje i RS Store.
   Expected: Kampanjen er oppdatert.
4. Verifiser i POS.
   Expected: POS bruker oppdatert kampanje korrekt.

## Pass Criteria

Testen passerer nar endret kampanje flyter og virker i POS.

## Fail Criteria

Testen feiler hvis endringen ikke mottas, vises eller brukes korrekt.

## Blockers / Risks

- Krever SAP-tilgang og aktiv kampanje.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3520 2026-05-07. Ingen execution er utfort ved import.