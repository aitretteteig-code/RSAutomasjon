# HC-002 Redigering av oppskrift RS Store

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3399 - https://norgesgruppen.atlassian.net/browse/KOBT-3399
Area: Oppskrift / Produksjon
Priority: Normal
Status: PASSED
Documentation status: Ready, based on Jira description

## Objective

Verifisere at oppskrifter kan redigeres i RS Store, lagres, produseres og gi korrekt oppdatert deklarasjon.

## Preconditions

- Tilgang til RS Store.
- Minst én KG-oppskrift og én STK-oppskrift tilgjengelig for test.

## Test Data

- KG-oppskrift: Avklares ved execution.
- STK-oppskrift: Avklares ved execution.

## Steps

1. Søk opp en KG-oppskrift i RS Store.
   Expected: Oppskriften finnes og kan åpnes for redigering.
2. Legg til en ingrediens.
   Expected: Ingrediensen legges til uten feil.
3. Gjennomfør produksjon
   Expected: Produksjon gjennomføres uten problemer og næringsdeklarasjon er oppdatert
4. Fjern en ingrediens.
   Expected: Ingrediensen fjernes uten feil.
5. Gjennomfør produksjon
   Expected: Produksjon gjennomføres uten problemer og næringsdeklarasjon er oppdatert  
6. Gjenta prosses med STK-oppskrift
   Expected: Samme verifisering gjøres på STK produksjonen

## Pass Criteria

Testen passerer nar både KG- og STK-oppskrift kan endres, lagres og produseres med korrekt deklarasjon.

## Fail Criteria

Testen feiler hvis redigering ikke lagres, produksjon stopper, eller deklarasjon ikke oppdateres korrekt.

## Blockers / Risks

- Krever egnede oppskrifter med ingredienser som kan endres.

## Notes

Execution 2026-05-06 ble blokkert etter ustabil browser/RS Store-fane under ingrediensredigering. Ingen lagring ble observert.

Execution 2026-05-06 med Playwright passerte som kontrollert no-net redigering. Se `test-artifacts/executions/HC-002-20260506-playwright-pass.md`.

Execution 2026-05-07 med Playwright passerte. STK-oppskrift `514687` og KG-oppskrift `757709` ble redigert med kontrollert no-net add/remove av midlertidig ingrediens `966897`, lagret og verifisert. Produksjon `19604` ble opprettet/fullfort, og naeringsdeklarasjon/prissetting ble verifisert. Se `test-artifacts/executions/HC-002-20260507-101000-playwright-pass.md`.
