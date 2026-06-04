# REG-057 Article ID must show on ingredients in a recipe in RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3631 - https://norgesgruppen.atlassian.net/browse/KOBT-3631
Area: Oppskrift
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at Article ID vises på ingredienser i oppskrift i RS.

## Preconditions

- Tilgang til RS-oppskrift med ingredienser.

## Test Data

- Oppskrift med ingredienser/artikler.

## Steps

1. Åpne oppskrift og ingrediensliste i RS.
   Expected: Ingredienslisten vises.
2. Kontroller ingrediensene.
   Expected: Article ID vises på ingrediensene.

## Pass Criteria

Testen passerer nar Article ID vises på ingredienser.

## Fail Criteria

Testen feiler hvis Article ID mangler på ingrediensene.

## Blockers / Risks

- Jira-detaljer er delvis utilgjengelige fordi akseptansekriteriet ligger som bilde uten tekst.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3631 2026-05-07. Ingen execution er utfort ved import.