# REG-074 Plukk av WebOrdre i RS Store og sjekk av logg walley

Set: Regresjon
Default environment: Test
Source reference: KOBT-5192 - https://norgesgruppen.atlassian.net/browse/KOBT-5192
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere plukk av WebOrdre og Walley-logg for 20-koder med ujevnt antall.

## Preconditions

- Webordre og Walley-plugin/logg tilgjengelig.

## Test Data

- 20-koder med ujevnt antall.

## Steps

1. Plukk webordre i RS Store.
   Expected: Ordren kan plukkes.
2. Sjekk Walley-logg.
   Expected: 20-koder med ujevnt antall håndteres korrekt etter hotfix.

## Pass Criteria

Testen passerer nar webordre plukkes og Walley-logg viser korrekt håndtering.

## Fail Criteria

Testen feiler hvis plukk eller Walley-håndtering feiler.

## Blockers / Risks

- Jira har kort beskrivelse, mangler detaljerte expected.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5192 2026-05-07. Ingen execution er utfort ved import.