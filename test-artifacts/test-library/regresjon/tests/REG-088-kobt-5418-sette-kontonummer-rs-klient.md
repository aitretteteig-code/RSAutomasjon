# REG-088 Sette kontonummer - RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5418 - https://norgesgruppen.atlassian.net/browse/KOBT-5418
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Sette kontonummer i RS Klient.

## Preconditions

- RS Klient tilgjengelig med relevant tilgang.

## Test Data

- Kontonummerdata; sensitive detaljer oppgis ikke i testfil.

## Steps

1. Sett kontonummer i RS Klient.
   Expected: Verdien lagres.
2. Verifiser bruk av kontonummer i relevant flyt.
   Expected: Kontonummer brukes korrekt.

## Pass Criteria

Testen passerer nar kontonummer lagres og brukes korrekt.

## Fail Criteria

Testen feiler hvis kontonummer ikke lagres eller brukes feil.

## Blockers / Risks

- Jira-beskrivelse mangler; kun lukket relatert defekt BUT-5198.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5418 2026-05-07. Ingen execution er utfort ved import.