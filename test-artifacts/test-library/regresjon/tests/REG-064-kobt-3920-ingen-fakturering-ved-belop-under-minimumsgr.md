# REG-064 Ingen fakturering ved beløp under minimumsgrense (50)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3920 - https://norgesgruppen.atlassian.net/browse/KOBT-3920
Area: Faktura
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at faktura under minimumsgrense ikke sendes automatisk.

## Preconditions

- Kontokunde/fakturaflyt tilgjengelig.

## Test Data

- Faktura/fakturagrunnlag under 50 NOK.

## Steps

1. Opprett fakturagrunnlag under 50 NOK.
   Expected: Fakturagrunnlaget finnes i RS.
2. Kjør/verifiser automatisk fakturering.
   Expected: Automatisk faktura sendes ikke.

## Pass Criteria

Testen passerer nar faktura under 50 NOK ikke sendes automatisk.

## Fail Criteria

Testen feiler hvis faktura under grensen sendes automatisk.

## Blockers / Risks

- Jira har kun kort regelbeskrivelse.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3920 2026-05-07. Ingen execution er utfort ved import.