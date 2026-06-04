# REG-073 Oppgjør KMH (Manuell Pant)

Set: Regresjon
Default environment: Test
Source reference: KOBT-4488 - https://norgesgruppen.atlassian.net/browse/KOBT-4488
Area: Oppgjør
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere KMH-oppgjør for manuell pant.

## Preconditions

- KMH-oppsett med automatisk oppgjør unntatt manuell pant.

## Test Data

- Pantelapp og manuell pant.

## Steps

1. Scan pantelapp og bruk manuell pant.
   Expected: Manuell pant registreres.
2. Verifiser oppgjør.
   Expected: Kun manuell pant vises og telles manuelt.
3. Verifiser fil til regnskap.
   Expected: Kontering av pant er korrekt.

## Pass Criteria

Testen passerer nar kun manuell pant håndteres manuelt og regnskapsfil er korrekt.

## Fail Criteria

Testen feiler hvis pant vises/telles/konteres feil.

## Blockers / Risks

- Ingen tydelige blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4488 2026-05-07. Ingen execution er utfort ved import.