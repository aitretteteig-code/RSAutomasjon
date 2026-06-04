# REG-022 Varetelling RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3407 - https://norgesgruppen.atlassian.net/browse/KOBT-3407
Area: Varetelling
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Teste varetelling i RS Store.

## Preconditions

- Tilgang til RS Store og relevant varetellingsflyt.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Gjennomfør varetelling i RS Store.
   Expected: Varetellingen kan registreres og fullføres.
2. Verifiser oppdatering/rapport/flyt i RS.
   Expected: Varetelling er synlig i korrekt RS-flyt.

## Pass Criteria

Testen passerer nar varetelling i RS Store kan gjennomføres og verifiseres.

## Fail Criteria

Testen feiler hvis telling ikke kan opprettes/fullføres eller ikke vises korrekt.

## Blockers / Risks

- Jira har begrensede detaljer.
- Åpne defects knyttet til varetellingsrapport/nettopris kan påvirke test.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3407 2026-05-07. Ingen execution er utfort ved import.