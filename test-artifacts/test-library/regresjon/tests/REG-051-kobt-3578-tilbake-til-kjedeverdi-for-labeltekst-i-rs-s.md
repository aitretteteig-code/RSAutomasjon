# REG-051 Tilbake til kjedeverdi for Labeltekst i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3578 - https://norgesgruppen.atlassian.net/browse/KOBT-3578
Area: Vare
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere tilbake til kjedeverdi for hylletekst/labeltekst.

## Preconditions

- Bruker med riktige RS-rettigheter.
- Vare med lokal hylletekst.

## Test Data

- Vare med lokal hylletekst 1, 2 eller 3.

## Steps

1. Åpne vare med lokal hylletekst.
   Expected: Lokal verdi og kjedeverdi kan sees.
2. Velg tilbake til kjedeverdi.
   Expected: Kjedeverdi gjenopprettes.
3. Valider eventuell etikettvisning hvis relevant.
   Expected: Labeltekst er korrekt der den vises.

## Pass Criteria

Testen passerer nar hylletekst kan settes tilbake til kjedeverdi.

## Fail Criteria

Testen feiler hvis kjedeverdi ikke vises eller ikke gjenopprettes.

## Blockers / Risks

- Åpen defect BUT-5264: hylletekst vises ikke på etiketter, relevant hvis etikett valideres.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3578 2026-05-07. Ingen execution er utfort ved import.