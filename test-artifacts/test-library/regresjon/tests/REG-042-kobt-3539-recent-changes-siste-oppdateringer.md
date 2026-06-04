# REG-042 Recent changes/siste oppdateringer

Set: Regresjon
Default environment: Test
Source reference: KOBT-3539 - https://norgesgruppen.atlassian.net/browse/KOBT-3539
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere Recent changes/siste oppdateringer i RS Store.

## Preconditions

- Tilgang til RS Store.
- Mulighet til å endre salgspris og innpris.

## Test Data

- Vare for prisendring.

## Steps

1. Gjør salgsprisendring på en vare.
   Expected: Endringen lagres.
2. Gjør innprisendring på en vare.
   Expected: Endringen lagres.
3. Åpne siste oppdateringer.
   Expected: Endringene dukker opp og fungerer likt eller bedre enn prod.

## Pass Criteria

Testen passerer nar prisendringene vises korrekt i siste oppdateringer.

## Fail Criteria

Testen feiler hvis endringer ikke vises eller vises feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3539 2026-05-07. Ingen execution er utfort ved import.