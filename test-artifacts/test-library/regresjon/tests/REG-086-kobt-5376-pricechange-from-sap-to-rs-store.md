# REG-086 Pricechange from SAP to RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-5376 - https://norgesgruppen.atlassian.net/browse/KOBT-5376
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere prisendring fra SAP til RS Store.

## Preconditions

- SAP, preprocessor og RS Store tilgjengelig.

## Test Data

- Prisendringsdata.

## Steps

1. Send prisendring fra SAP.
   Expected: Prisendringen mottas/prosesseres.
2. Verifiser pris i RS Store.
   Expected: Korrekt pris er oppdatert i RS Store.

## Pass Criteria

Testen passerer nar prisendringen fra SAP vises korrekt i RS Store.

## Fail Criteria

Testen feiler hvis pris ikke oppdateres eller feil pris vises.

## Blockers / Risks

- Jira-description ser ut til å omtale assortment, ikke pricechange; detaljer mangler.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5376 2026-05-07. Ingen execution er utfort ved import.