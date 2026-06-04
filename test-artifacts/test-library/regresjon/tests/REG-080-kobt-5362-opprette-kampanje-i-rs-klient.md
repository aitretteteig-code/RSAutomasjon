# REG-080 Opprette kampanje i RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5362 - https://norgesgruppen.atlassian.net/browse/KOBT-5362
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette kampanje i RS Klient.

## Preconditions

- Tilgang RS Klient og kampanjeoppsett.

## Test Data

- Kampanjedata.

## Steps

1. Opprett kampanje i RS Klient.
   Expected: Kampanjen lagres.
2. Verifiser relevant RS-flyt.
   Expected: Kampanjen blir tilgjengelig der den skal brukes.

## Pass Criteria

Testen passerer nar kampanje opprettes og blir tilgjengelig i RS-flyt.

## Fail Criteria

Testen feiler hvis kampanje ikke lagres eller ikke flyter videre.

## Blockers / Risks

- Jira mangler description/steps/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5362 2026-05-07. Ingen execution er utfort ved import.