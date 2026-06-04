# REG-076 Etikettutskrift i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-5328 - https://norgesgruppen.atlassian.net/browse/KOBT-5328
Area: Etikett
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere nedlasting/utskrift av etiketter i RS.

## Preconditions

- Tilgang RS etikettfunksjon.

## Test Data

- Etiketter 106, 107, 1012, 1013, 2005 og 2012.

## Steps

1. Last ned eller skriv ut hver listet etikett.
   Expected: Etiketten genereres.
2. Verifiser innhold og format.
   Expected: Etiketten har korrekt innhold og format.

## Pass Criteria

Testen passerer nar alle listede etiketter kan genereres med korrekt innhold.

## Fail Criteria

Testen feiler hvis etikett mangler, ikke kan genereres eller har feil innhold.

## Blockers / Risks

- Åpne defects BUT-5218 og BUT-5219 på etikettinnhold.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5328 2026-05-07. Ingen execution er utfort ved import.