# REG-017 Opprette abonnement på rapport i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3397 - https://norgesgruppen.atlassian.net/browse/KOBT-3397
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette og avslutte rapportabonnement i RS og verifisere mottak.

## Preconditions

- Tilgang til RS.
- Mottakskanal/input for rapport er tilgjengelig.

## Test Data

- Rapport som skal abonneres pa.
- Input/mottaker for rapport.

## Steps

1. Opprett abonnement for valgt rapport i RS.
   Expected: Abonnement lagres.
2. Verifiser at rapport mottas til satt input.
   Expected: Rapport mottas korrekt.
3. Avslutt abonnementet.
   Expected: Abonnement avsluttes og skal ikke fortsette a sende rapport.

## Pass Criteria

Testen passerer nar abonnement opprettes, rapport mottas og abonnement kan avsluttes.

## Fail Criteria

Testen feiler hvis abonnement ikke lagres, rapport ikke mottas, eller avslutning ikke fungerer.

## Blockers / Risks

- Jira spesifiserer ikke konkret rapport eller input.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3397 2026-05-07. Ingen execution er utfort ved import.