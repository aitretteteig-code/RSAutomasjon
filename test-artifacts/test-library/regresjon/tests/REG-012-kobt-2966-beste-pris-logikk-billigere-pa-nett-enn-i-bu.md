# REG-012 Beste pris logikk - Billigere på nett enn i butikk

Set: Regresjon
Default environment: Test
Source reference: KOBT-2966 - https://norgesgruppen.atlassian.net/browse/KOBT-2966
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Validere beste pris nar nettpris/kampanjepris er lavere enn butikkpris.

## Preconditions

- Kunde har handlet kampanjemerket vare pa nett.
- Varen er gatt av kampanje ved plukk i RS.

## Test Data

- Kampanjevare fra nettordre.

## Steps

1. Opprett eller finn nettordre med kampanjevare.
   Expected: Ordren inneholder kampanjepris fra nett.
2. Plukk varen i RS etter at varen ikke lenger er pa kampanje i butikk.
   Expected: Opprinnelig kampanjepris fra nett beholdes.
3. Verifiser kvittering/prisgrunnlag.
   Expected: Kampanjepris gjelder for kunden.

## Pass Criteria

Testen passerer nar kampanjepris fra netthandel brukes som beste pris.

## Fail Criteria

Testen feiler hvis butikkpris eller ny pris overstyrer lavere nettpris.

## Blockers / Risks

- Krever egnet nettordre/kampanjevare.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2966 2026-05-07. Ingen execution er utfort ved import.