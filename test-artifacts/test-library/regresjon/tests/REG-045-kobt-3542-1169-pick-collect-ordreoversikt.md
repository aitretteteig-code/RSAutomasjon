# REG-045 1169 Pick&Collect ordreoversikt

Set: Regresjon
Default environment: Test
Source reference: KOBT-3542 - https://norgesgruppen.atlassian.net/browse/KOBT-3542
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere 1169 Pick&Collect ordreoversikt.

## Preconditions

- Bruk Meny Jessheim.
- Eventuelt generer data i preprod Meny.no.
- Credentials hentes fra godkjent vault, ikke dokumenteres lokalt.

## Test Data

- Pick&Collect-ordre/testordre.

## Steps

1. Åpne Pick&Collect ordreoversikt 1169.
   Expected: Rapport/oversikt åpnes.
2. Valider innhold og layout for relevante ordre.
   Expected: Ordre vises korrekt.

## Pass Criteria

Testen passerer nar ordreoversikten viser relevante ordre korrekt.

## Fail Criteria

Testen feiler hvis ordre mangler, layout er feil eller rapport ikke laster.

## Blockers / Risks

- Krever testdata og tilgang til preprod/vault.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3542 2026-05-07. Ingen execution er utfort ved import.