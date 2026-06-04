# REG-026 Opprettelse av kundeavis kampanje

Set: Regresjon
Default environment: Test
Source reference: KOBT-3421 - https://norgesgruppen.atlassian.net/browse/KOBT-3421
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette kundeavis-kampanje og validere flyt SAP -> RS Connector -> RS Store -> POS.

## Preconditions

- Precondition BUT-4046: kundeavis/kampanjegrunnlag opprettet.
- Kampanjegrunnlag bør dekke kjøl/frys/iskrem, øl unntatt.
- Tilgang til SAP/RS Connector/RS Store/POS.

## Test Data

- Kundeavis-kampanjeartikler.

## Steps

1. Opprett kundeavis-kampanje i SAP.
   Expected: Kampanje sendes fra SAP.
2. Verifiser mottak i RS Connector.
   Expected: Kampanje mottas i connector.
3. Verifiser kampanje i RS Store.
   Expected: Kampanje er synlig og korrekt.
4. Verifiser kampanje i POS.
   Expected: POS bruker kampanjen korrekt.

## Pass Criteria

Testen passerer nar kundeavis-kampanje flyter korrekt fra SAP til RS og POS.

## Fail Criteria

Testen feiler hvis kampanjen stopper eller vises/prissettes feil.

## Blockers / Risks

- Krever SAP-opprettelse/ressurs.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3421 2026-05-07. Ingen execution er utfort ved import.