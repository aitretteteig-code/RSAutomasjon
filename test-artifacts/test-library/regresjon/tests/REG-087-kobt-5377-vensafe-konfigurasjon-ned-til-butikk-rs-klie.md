# REG-087 Vensafe konfigurasjon ned til butikk - RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5377 - https://norgesgruppen.atlassian.net/browse/KOBT-5377
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere Vensafe-konfigurasjon ned til butikk i RS Klient.

## Preconditions

- RS Klient og butikkoppsett tilgjengelig.

## Test Data

- Vensafe-konfigurasjon.

## Steps

1. Endre eller verifiser Vensafe-konfigurasjon i RS Klient.
   Expected: Konfigurasjon lagres.
2. Verifiser distribusjon til butikk.
   Expected: Vensafe-konfigurasjon distribueres til butikk.

## Pass Criteria

Testen passerer nar Vensafe-konfigurasjon lagres og distribueres korrekt.

## Fail Criteria

Testen feiler hvis konfigurasjon ikke lagres eller ikke når butikk.

## Blockers / Risks

- Jira-beskrivelse mangler; kun lukket relatert defekt BUT-5200.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5377 2026-05-07. Ingen execution er utfort ved import.