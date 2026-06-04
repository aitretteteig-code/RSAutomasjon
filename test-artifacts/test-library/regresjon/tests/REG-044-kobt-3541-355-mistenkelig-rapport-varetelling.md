# REG-044 355 Mistenkelig rapport varetelling

Set: Regresjon
Default environment: Test
Source reference: KOBT-3541 - https://norgesgruppen.atlassian.net/browse/KOBT-3541
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 355 Varetelling - Mistenkelige varer.

## Preconditions

- Tilgang til RS Store og prod-sammenligning.

## Test Data

- Eksisterende varetellingsdata.

## Steps

1. Åpne rapport 355 under Lager -> Varetelling -> Rapporter.
   Expected: Rapporten åpnes.
2. Mål lastetid og sammenlign innhold mot prod.
   Expected: Rapporten laster innen maks 1 minutt og er lik eller bedre enn prod.

## Pass Criteria

Testen passerer nar rapport 355 laster og viser forventet innhold.

## Fail Criteria

Testen feiler hvis rapporten er tom, ikke laster eller avviker negativt fra prod.

## Blockers / Risks

- Åpen defect BUT-5250: rapport 355 er tom.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3541 2026-05-07. Ingen execution er utfort ved import.