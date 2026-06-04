# REG-048 1173 Forhåndsorde

Set: Regresjon
Default environment: Test
Source reference: KOBT-3545 - https://norgesgruppen.atlassian.net/browse/KOBT-3545
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 1173 Forhåndsordre.

## Preconditions

- Pick&Collect-testdata i RS eller generert i preprod Meny.no.

## Test Data

- Forhåndsordre.

## Steps

1. Åpne rapport 1173.
   Expected: Rapporten åpnes.
2. Kontroller at forhåndsordre/testdata vises korrekt.
   Expected: Forhåndsordre vises med forventet innhold.

## Pass Criteria

Testen passerer nar forhåndsordre vises korrekt.

## Fail Criteria

Testen feiler hvis rapporten mangler ordre eller viser feil.

## Blockers / Risks

- Jira har begrensede steg/expected.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3545 2026-05-07. Ingen execution er utfort ved import.