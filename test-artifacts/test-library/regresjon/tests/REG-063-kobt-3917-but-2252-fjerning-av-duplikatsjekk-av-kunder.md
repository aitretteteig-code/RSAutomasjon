# REG-063 BUT-2252 Fjerning av duplikatsjekk av kunder

Set: Regresjon
Default environment: Test
Source reference: KOBT-3917 - https://norgesgruppen.atlassian.net/browse/KOBT-3917
Area: Kunde
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere fjerning av duplikatsjekk av kunder og korrekt fakturareferanse.

## Preconditions

- Testkunder med mor/barn/duplikatoppsett finnes.

## Test Data

- Horten kommune/Åsgården-eksempler fra Jira.

## Steps

1. Sett opp eller finn kundene i mor/barn/duplikatstrukturen fra Jira.
   Expected: Kundene er tilgjengelige.
2. Fakturer for de forskjellige kundene.
   Expected: Fakturaer opprettes.
3. Verifiser fakturareferanser.
   Expected: Referanser på faktura er riktige for kundene.

## Pass Criteria

Testen passerer nar duplikatoppsett fungerer og fakturareferanser er korrekte.

## Fail Criteria

Testen feiler hvis kundeoppsett hindres av duplikatsjekk eller referanser blir feil.

## Blockers / Risks

- Åpen blocker BUT-2897: blank fakturautskrift.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3917 2026-05-07. Ingen execution er utfort ved import.