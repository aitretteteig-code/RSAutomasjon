# REG-060 Kopiere enn eksisterende kampanje til en ny kampanje

Set: Regresjon
Default environment: Test
Source reference: KOBT-3690 - https://norgesgruppen.atlassian.net/browse/KOBT-3690
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere kopiering av eksisterende kampanje til ny kampanje.

## Preconditions

- Bruker med relevante kampanjerettigheter.
- Eksisterende kampanje.

## Test Data

- Kampanje med artikler, salgspriser og nettokostnadspriser.

## Steps

1. Kopier eksisterende kampanje.
   Expected: Ny kampanje opprettes.
2. Verifiser kopiert innhold.
   Expected: Artikler, salgspriser og nettokostnadspriser er kopiert.
3. Verifiser datoer.
   Expected: Fra-dato er i dag og til-dato beregnes fra gammel varighet.
4. Verifiser rettighetsstyring og datomaks.
   Expected: Bare tillatte kampanjeelementer kopieres og datomaks respekteres.

## Pass Criteria

Testen passerer nar kampanje kopieres med korrekt innhold, datoer og rettighetsbegrensninger.

## Fail Criteria

Testen feiler hvis innhold/dato/rettigheter kopieres feil.

## Blockers / Risks

- Defects BUT-5217 og BUT-5215 er Ready for System Test og kan påvirke kopiering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3690 2026-05-07. Ingen execution er utfort ved import.