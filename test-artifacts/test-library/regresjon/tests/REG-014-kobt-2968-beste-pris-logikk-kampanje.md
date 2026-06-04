# REG-014 Beste pris logikk - kampanje

Set: Regresjon
Default environment: Test
Source reference: KOBT-2968 - https://norgesgruppen.atlassian.net/browse/KOBT-2968
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Needs detail, Jira lacks description

## Objective

Validere beste pris-logikk for kampanje.

## Preconditions

- Testmiljo og Pick&Collect.
- Detaljert kampanjetestdata ma avklares.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Avklar kampanjeoppsett og testordre for execution.
   Expected: Testdata og forventet prisregel er kjent.
2. Gjennomfor Pick&Collect-plukk for kampanjevaren.
   Expected: Kampanjepris handteres korrekt etter beste pris-logikk.

## Pass Criteria

Testen passerer nar kampanjepris er korrekt i Pick&Collect/kvittering.

## Fail Criteria

Testen feiler hvis kampanjepris ikke brukes eller feil pris vinner.

## Blockers / Risks

- Mangler description, konkrete steg og testdata i Jira.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2968 2026-05-07. Ingen execution er utfort ved import.