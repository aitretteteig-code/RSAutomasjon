# REG-023 Varetelling RS - POS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3412 - https://norgesgruppen.atlassian.net/browse/KOBT-3412
Area: POS
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere varetelling fra POS til RS.

## Preconditions

- Tilgang til POS og RS.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Gjennomfør varetelling fra POS.
   Expected: Telling sendes fra POS.
2. Verifiser flyt til RS.
   Expected: Telling mottas og kan verifiseres i RS.

## Pass Criteria

Testen passerer nar varetelling fra POS er mottatt/verifisert i RS.

## Fail Criteria

Testen feiler hvis POS-telling ikke flyter til RS.

## Blockers / Risks

- Jira mangler detaljerte steg/testdata.
- Krever POS-integrasjon.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3412 2026-05-07. Ingen execution er utfort ved import.