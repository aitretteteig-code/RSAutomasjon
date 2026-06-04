# REG-059 Test av sletting av frivillig vare .

Set: Regresjon
Default environment: Test
Source reference: KOBT-3656 - https://norgesgruppen.atlassian.net/browse/KOBT-3656
Area: Vare
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere sletting av frivillig vare fra sortiment.

## Preconditions

- Tilgang til RS og kasse/POS.

## Test Data

- Frivillig vare.

## Steps

1. Søk opp frivillig vare i RS.
   Expected: Varen finnes.
2. Slett varen fra sortiment.
   Expected: Varen fjernes fra sortiment.
3. Forsøk salg i kasse.
   Expected: Varen kan ikke selges.

## Pass Criteria

Testen passerer nar slettet frivillig vare ikke kan selges.

## Fail Criteria

Testen feiler hvis varen fortsatt kan selges eller sletting ikke lagres.

## Blockers / Risks

- Ingen tydelige blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3656 2026-05-07. Ingen execution er utfort ved import.