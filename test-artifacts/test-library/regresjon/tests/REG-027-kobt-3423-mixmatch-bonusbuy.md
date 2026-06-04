# REG-027 Mixmatch(bonusbuy)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3423 - https://norgesgruppen.atlassian.net/browse/KOBT-3423
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette MixMatch/BonusBuy og validere flyt SAP -> RS Connector -> RS Store -> POS.

## Preconditions

- Precondition KOBT-4047: SAP-ressurs oppretter MixMatch i R3T for Test.
- Tilgang til SAP/RS Connector/RS Store/POS.

## Test Data

- MixMatch-varer med varenavn og EAN.

## Steps

1. Opprett MixMatch/BonusBuy i SAP.
   Expected: MixMatch sendes fra SAP.
2. Verifiser mottak i RS Connector.
   Expected: MixMatch mottas i connector.
3. Verifiser MixMatch i RS Store.
   Expected: MixMatch er synlig og korrekt.
4. Verifiser MixMatch i POS.
   Expected: POS beregner MixMatch korrekt.

## Pass Criteria

Testen passerer nar BonusBuy flyter korrekt til RS og POS.

## Fail Criteria

Testen feiler hvis BonusBuy ikke mottas eller ikke beregnes korrekt.

## Blockers / Risks

- Krever SAP-ressurs.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3423 2026-05-07. Ingen execution er utfort ved import.