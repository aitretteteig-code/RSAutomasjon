# REG-035 Opprettelse av Batch i RS og produksjon med Batch

Set: Regresjon
Default environment: Test
Source reference: KOBT-3518 - https://norgesgruppen.atlassian.net/browse/KOBT-3518
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette batch i RS og bruke batch i produksjon.

## Preconditions

- Tilgang til RS produksjon/batch.

## Test Data

- Batch og produksjonsvare.

## Steps

1. Opprett batch i RS.
   Expected: Batch opprettes.
2. Benytt batch i produksjon.
   Expected: Produksjon kan bruke batchen.

## Pass Criteria

Testen passerer nar batch opprettes og kan brukes i produksjon.

## Fail Criteria

Testen feiler hvis batch ikke opprettes eller ikke kan brukes.

## Blockers / Risks

- Jira har svært korte steg.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3518 2026-05-07. Ingen execution er utfort ved import.