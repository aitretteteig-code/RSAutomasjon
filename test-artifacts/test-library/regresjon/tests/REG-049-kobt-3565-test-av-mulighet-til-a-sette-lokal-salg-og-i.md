# REG-049 Test av mulighet til å sette lokal salg og innpris opp til 28 dager fram i tid

Set: Regresjon
Default environment: Test
Source reference: KOBT-3565 - https://norgesgruppen.atlassian.net/browse/KOBT-3565
Area: Pris
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere lokal salgspris og innpris opptil 28 dager frem i tid.

## Preconditions

- Bruk standardvarer.
- Ikke bruk butikkopprettede varer, sortimentskode B eller husets varer.

## Test Data

- Standardvare for lokal salgspris og innpris.

## Steps

1. Sett lokal salgspris 28 dager frem i tid.
   Expected: Salgspris kan lagres innen regelverket.
2. Sett lokal innpris 28 dager frem i tid.
   Expected: Innpris kan lagres innen regelverket.
3. Verifiser periodehåndtering.
   Expected: Gyldighetsperiode håndteres korrekt.

## Pass Criteria

Testen passerer nar lokal salgspris og innpris kan settes 28 dager frem og periode er korrekt.

## Fail Criteria

Testen feiler hvis pris ikke kan lagres eller periodevalidering er feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3565 2026-05-07. Ingen execution er utfort ved import.