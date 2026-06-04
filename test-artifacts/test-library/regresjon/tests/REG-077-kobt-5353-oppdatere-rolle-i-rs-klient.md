# REG-077 Oppdatere rolle i RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5353 - https://norgesgruppen.atlassian.net/browse/KOBT-5353
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Oppdatere rolle i RS Klient og verifisere flyt til RS Store.

## Preconditions

- Tilgang RS Klient og RS Store.

## Test Data

- Bruker/rolle.

## Steps

1. Oppdater rolle i RS Klient.
   Expected: Rolleendring lagres.
2. Verifiser i RS Store.
   Expected: Endringen flyter til RS Store.

## Pass Criteria

Testen passerer nar rolleendring i RS Klient vises i RS Store.

## Fail Criteria

Testen feiler hvis rolleendring ikke flyter korrekt.

## Blockers / Risks

- Jira har kort beskrivelse.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5353 2026-05-07. Ingen execution er utfort ved import.