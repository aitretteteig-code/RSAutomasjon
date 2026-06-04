# REG-040 Innbetaling av Faktura

Set: Regresjon
Default environment: Test
Source reference: KOBT-3530 - https://norgesgruppen.atlassian.net/browse/KOBT-3530
Area: Faktura
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere innbetaling av faktura mot regnskap, inkludert delinnbetaling og overbetaling.

## Preconditions

- Fakturaer må finnes.
- Regnskapsverifisering tilgjengelig.

## Test Data

- Faktura for delinnbetaling.
- Faktura for overbetaling.

## Steps

1. Verifiser faktura mot regnskap.
   Expected: Faktura finnes i regnskapsflyt.
2. Registrer/verifiser delinnbetaling.
   Expected: Delinnbetaling håndteres korrekt.
3. Registrer/verifiser overbetaling.
   Expected: Overbetaling håndteres korrekt.

## Pass Criteria

Testen passerer nar regnskap, delinnbetaling og overbetaling håndteres korrekt.

## Fail Criteria

Testen feiler hvis innbetaling ikke matcher forventet regnskapsflyt.

## Blockers / Risks

- Jira mangler detaljerte steg/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3530 2026-05-07. Ingen execution er utfort ved import.