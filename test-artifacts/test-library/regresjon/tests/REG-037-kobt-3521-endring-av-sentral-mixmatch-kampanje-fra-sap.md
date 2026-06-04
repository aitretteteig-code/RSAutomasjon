# REG-037 Endring av Sentral Mixmatch kampanje fra SAP

Set: Regresjon
Default environment: Test
Source reference: KOBT-3521 - https://norgesgruppen.atlassian.net/browse/KOBT-3521
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Endre sentral MixMatch/BonusBuy fra SAP og validere i RS/POS.

## Preconditions

- Precondition KOBT-4049: aktiv MixMatch finnes og kan endres.
- Tilgang til SAP, RS Connector, RS Store og POS.

## Test Data

- Eksisterende MixMatch/BonusBuy og artikler.

## Steps

1. Endre MixMatch/BonusBuy i SAP.
   Expected: Endringen sendes fra SAP.
2. Verifiser mottak i RS Connector.
   Expected: Endret BonusBuy mottas.
3. Verifiser i RS Store.
   Expected: BonusBuy er oppdatert.
4. Verifiser i POS.
   Expected: POS beregner oppdatert BonusBuy korrekt.

## Pass Criteria

Testen passerer nar endret BonusBuy flyter og virker i POS.

## Fail Criteria

Testen feiler hvis endringen ikke mottas, vises eller beregnes korrekt.

## Blockers / Risks

- Krever SAP-tilgang og aktiv MixMatch.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3521 2026-05-07. Ingen execution er utfort ved import.