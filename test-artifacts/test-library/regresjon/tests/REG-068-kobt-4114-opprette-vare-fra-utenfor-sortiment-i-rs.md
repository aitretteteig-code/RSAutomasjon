# REG-068 Opprette vare fra utenfor sortiment i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-4114 - https://norgesgruppen.atlassian.net/browse/KOBT-4114
Area: Vare
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette vare fra utenfor sortiment i RS og verifisere salg.

## Preconditions

- Tilgang RS og POS.

## Test Data

- Vare utenfor sortiment.

## Steps

1. Søk opp vare utenfor sortiment i RS.
   Expected: Varen finnes i søk.
2. Legg til varen.
   Expected: Varen legges til i sortiment.
3. Verifiser at varen vises i RS.
   Expected: Varen er synlig i RS.
4. Selg varen i POS.
   Expected: Varen kan selges.

## Pass Criteria

Testen passerer nar vare utenfor sortiment legges til og kan selges.

## Fail Criteria

Testen feiler hvis varen ikke legges til, ikke vises eller ikke kan selges.

## Blockers / Risks

- Ingen tydelige blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4114 2026-05-07. Ingen execution er utfort ved import.