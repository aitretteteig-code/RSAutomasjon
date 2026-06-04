# REG-071 Test storeinstaller for BO version 24.9.1

Set: Regresjon
Default environment: Test
Source reference: KOBT-4136 - https://norgesgruppen.atlassian.net/browse/KOBT-4136
Area: Teknisk
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere storeinstaller for BO version 24.9.1 og berørte funksjoner.

## Preconditions

- Testmiljø med BO/installasjon og relevante integrasjoner.

## Test Data

- Scales, ESL, Vensafe, POS, SCO, Reverse vending, Sales restrictions, Article Recall og brukere.

## Steps

1. Installer/valider BO version 24.9.1.
   Expected: Installer fullføres uten feil.
2. Valider listede integrasjoner/funksjonsområder.
   Expected: Alle områder fungerer etter installasjon.
3. Endre en bruker i RS og legg til ny bruker.
   Expected: Brukerendringer fungerer.

## Pass Criteria

Testen passerer nar installasjon og listede funksjonsområder fungerer.

## Fail Criteria

Testen feiler hvis installasjon eller et kritisk område feiler.

## Blockers / Risks

- Åpen defect BUT-5568: kampanjemerking kommer ikke over til ESL.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4136 2026-05-07. Ingen execution er utfort ved import.