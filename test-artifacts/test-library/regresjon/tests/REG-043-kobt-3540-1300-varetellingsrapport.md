# REG-043 1300 Varetellingsrapport

Set: Regresjon
Default environment: Test
Source reference: KOBT-3540 - https://norgesgruppen.atlassian.net/browse/KOBT-3540
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 1300 Varetellingsrapport.

## Preconditions

- Tilgang til RS Store: Lager -> Varetelling.

## Test Data

- Eksisterende varetellingsdata.

## Steps

1. Åpne rapport 1300 under Lager -> Varetelling.
   Expected: Rapporten åpnes.
2. Mål lastetid og kontroller innhold.
   Expected: Rapporten laster innen maks 1 minutt og viser forventet innhold.

## Pass Criteria

Testen passerer nar rapporten laster innen frist og innholdet er korrekt.

## Fail Criteria

Testen feiler hvis rapporten ikke laster, bruker over 1 minutt eller viser feil innhold.

## Blockers / Risks

- Aktiv defect BUT-2217: flere varer uten navn i rapport 1300.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3540 2026-05-07. Ingen execution er utfort ved import.