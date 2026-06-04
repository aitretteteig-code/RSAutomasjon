# REG-033 Svinnregistrering i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3435 - https://norgesgruppen.atlassian.net/browse/KOBT-3435
Area: Lager
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Registrere svinn/lagerkorreksjon i RS Store.

## Preconditions

- Tilgang til RS Store.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Gå til Lager -> Lagerkorreksjon.
   Expected: Lagerkorreksjon er tilgjengelig.
2. Gjennomfør lagerkorreksjon/svinnregistrering.
   Expected: Korreksjonen registreres.

## Pass Criteria

Testen passerer nar lagerkorreksjon kan gjennomføres og dokumenteres.

## Fail Criteria

Testen feiler hvis lagerkorreksjon ikke kan registreres.

## Blockers / Risks

- Jira mangler verifikasjonsdetaljer.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3435 2026-05-07. Ingen execution er utfort ved import.