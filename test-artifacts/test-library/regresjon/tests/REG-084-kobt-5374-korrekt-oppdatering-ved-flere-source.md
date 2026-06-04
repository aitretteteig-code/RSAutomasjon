# REG-084 Korrekt oppdatering ved flere source

Set: Regresjon
Default environment: Test
Source reference: KOBT-5374 - https://norgesgruppen.atlassian.net/browse/KOBT-5374
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere korrekt oppdatering ved flere source-filer.

## Preconditions

- Preprocessor tilgjengelig.

## Test Data

- Rader/filer hvor forrige rad har annen source og ikke er bekreftet OK fra Item.

## Steps

1. Prosesser input med flere source-filer/rader.
   Expected: Input behandles.
2. Verifiser filvalg i sammenligning.
   Expected: Preprocessor velger riktig fil i sammenligning.

## Pass Criteria

Testen passerer nar preprocessor velger korrekt source-fil.

## Fail Criteria

Testen feiler hvis feil fil/source brukes i sammenligning.

## Blockers / Risks

- Mangler detaljerte Jira-steg/expected/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5374 2026-05-07. Ingen execution er utfort ved import.