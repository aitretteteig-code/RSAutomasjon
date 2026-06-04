# REG-011 Beste pris logikk - Billigere i butikk enn på nett

Set: Regresjon
Default environment: Test
Source reference: KOBT-2965 - https://norgesgruppen.atlassian.net/browse/KOBT-2965
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Validere beste pris nar butikkpris er lavere enn netthandelspris.

## Preconditions

- Butikk har satt lokal pris pa varen.
- Netthandel viser full pris.

## Test Data

- Vare med lavere lokal butikkpris enn nettpris.

## Steps

1. Opprett eller finn Pick&Collect-ordre med aktuell vare.
   Expected: Ordren inneholder vare med ulik pris i butikk og nett.
2. Plukk varen i RS/Pick&Collect.
   Expected: Laveste pris velges.
3. Verifiser kvittering.
   Expected: Butikkpris vises pa kvittering.

## Pass Criteria

Testen passerer nar laveste pris fra butikk vinner og vises pa kvittering.

## Fail Criteria

Testen feiler hvis netthandelspris/full pris brukes i stedet for laveste butikkpris.

## Blockers / Risks

- Krever Pick&Collect-ordre og vare med relevant prisoppsett.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2965 2026-05-07. Ingen execution er utfort ved import.