# REG-085 Assortment change from NGG to RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-5375 - https://norgesgruppen.atlassian.net/browse/KOBT-5375
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at sortimentsendringer fra NGG håndteres korrekt til RS Store.

## Preconditions

- NGG, preprocessor og RS Store tilgjengelig.

## Test Data

- Sortimentsendringer.

## Steps

1. Send sortimentsendring fra NGG.
   Expected: Endringen mottas i preprocessor.
2. Verifiser håndtering mot RS Store.
   Expected: Sortimentsendringen er korrekt i RS Store.

## Pass Criteria

Testen passerer nar sortimentsendring håndteres og vises korrekt.

## Fail Criteria

Testen feiler hvis sortimentsendring ikke kommer frem eller blir feil.

## Blockers / Risks

- Mangler detaljerte Jira-steg/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5375 2026-05-07. Ingen execution er utfort ved import.