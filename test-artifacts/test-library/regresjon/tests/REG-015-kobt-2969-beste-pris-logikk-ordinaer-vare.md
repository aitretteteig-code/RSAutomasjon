# REG-015 Beste pris logikk - Ordinær vare

Set: Regresjon
Default environment: Test
Source reference: KOBT-2969 - https://norgesgruppen.atlassian.net/browse/KOBT-2969
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Needs detail, Jira lacks description

## Objective

Validere beste pris-logikk for ordinær vare.

## Preconditions

- Testmiljo og Pick&Collect.
- Detaljert testdata ma avklares.

## Test Data

- Ikke spesifisert i Jira.

## Steps

1. Avklar ordinær vare og forventet prisgrunnlag for execution.
   Expected: Testdata og forventet prisregel er kjent.
2. Gjennomfor Pick&Collect-plukk for varen.
   Expected: Ordinær vare prises korrekt etter beste pris-logikk.

## Pass Criteria

Testen passerer nar ordinær vare prises korrekt.

## Fail Criteria

Testen feiler hvis feil pris beregnes eller vises.

## Blockers / Risks

- Mangler description, konkrete steg og testdata i Jira.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2969 2026-05-07. Ingen execution er utfort ved import.