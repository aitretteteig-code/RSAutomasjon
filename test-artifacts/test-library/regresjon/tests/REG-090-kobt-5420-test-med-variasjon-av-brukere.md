# REG-090 Test med variasjon av brukere

Set: Regresjon
Default environment: Test
Source reference: KOBT-5420 - https://norgesgruppen.atlassian.net/browse/KOBT-5420
Area: Tilgang
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Teste tilgangsvariasjon mellom butikksjef og butikkmedarbeider.

## Preconditions

- To brukere/roller tilgjengelig.
- Nettlesere kan brukes parallelt ved manuell test; sensitive credentials dokumenteres ikke.

## Test Data

- Bruker med rolle butikksjef.
- Bruker med rolle butikkmedarbeider.

## Steps

1. Logg inn med butikksjefrolle og kontroller tilganger.
   Expected: Butikksjef har forventede tilganger.
2. Logg inn med butikkmedarbeiderrolle og kontroller tilganger.
   Expected: Butikkmedarbeider har begrenset korrekt tilgang.
3. Sammenlign rollene.
   Expected: Tilgangsnivåene er korrekte per rolle.

## Pass Criteria

Testen passerer nar begge roller har riktig tilgangsnivå.

## Fail Criteria

Testen feiler hvis en rolle har for mye eller for lite tilgang.

## Blockers / Risks

- Åpen defekt BUT-5233: butikkmedarbeider har flere tilganger enn nødvendig.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5420 2026-05-07. Ingen execution er utfort ved import.