# REG-055 Varmebehandlingsdato oppskriftsvare

Set: Regresjon
Default environment: Test
Source reference: KOBT-3625 - https://norgesgruppen.atlassian.net/browse/KOBT-3625
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere varmebehandlingsdato på oppskriftsvare/batch.

## Preconditions

- Tilgang til batch/produksjon.
- Tilgang til traceability rapport 372 og vekt.

## Test Data

- Batch/oppskriftsvare med varmebehandlingsdato.

## Steps

1. Opprett batch eller produksjon med varmebehandlingsdato.
   Expected: Default dato er dagens dato.
2. Forsøk å sette dato bakover og fremover.
   Expected: Bakover i tid er ikke tillatt, fremover er tillatt.
3. Verifiser batchinfo, rapport 372 og vekt.
   Expected: Dato er synlig og sendes i traceability-format.

## Pass Criteria

Testen passerer nar varmebehandlingsdato valideres, vises og eksporteres korrekt.

## Fail Criteria

Testen feiler hvis datoregel, rapport eller vekteksport er feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3625 2026-05-07. Ingen execution er utfort ved import.