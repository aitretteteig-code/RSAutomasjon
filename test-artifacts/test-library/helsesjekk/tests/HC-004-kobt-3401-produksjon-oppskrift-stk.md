# HC-004 Produksjon av oppskrift STK

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3401 - https://norgesgruppen.atlassian.net/browse/KOBT-3401
Area: Oppskrift / Produksjon
Priority: Normal
Status: PASSED
Documentation status: Ready, based on Jira description

## Objective

Verifisere produksjon av STK-oppskrift i RS Store og at pris, deklarasjon og vektvisning oppdateres korrekt.

## Preconditions

- Tilgang til RS Store.
- Tilgang til vekt/periferi hvis full ende-til-ende-verifisering skal gjores.
- Egnet STK-oppskrift finnes i butikken.

## Test Data

Eksempelvarer fra Jira:

- COLESLAW SIDEORDER PR STK - 1537
- BRUN LAPSKAUS M/FLATBROD PR STK - 9451
- BROKKOLISALAT M/BRINGEBAR PR STK - 8964

## Steps

1. Åpne RS Store og finn en av STK-oppskriftene.
   Expected: Oppskriften finnes.
2. Gjennomfor produksjon av valgt oppskrift.
   Expected: Produksjonen lagres uten feil.
3. Verifiser nettopris.
   Expected: Nettopris blir oppdatert korrekt.
4. Verifiser næringsdeklarasjon.
   Expected: Næringsdeklarasjon oppdateres og settes som standard.
5. Verifiser varen på vekt.
   Expected: Varen vises på vekt med korrekt pris og deklarasjon.

## Pass Criteria

Testen passerer nar produksjonen er lagret og både nettopris, deklarasjon og vekt er verifisert.

## Fail Criteria

Testen feiler hvis produksjon ikke kan lagres eller hvis pris/deklarasjon ikke blir korrekt.

## Blockers / Risks

- Full verifisering krever tilgjengelig vekt/periferi.

## Notes

Execution 2026-05-15: RS Store-delen passerte med Playwright for `514687 - BROKKOLISALAT M/BACON PR STK`, produksjon `19608`. Plukk, produksjonsdeklarasjon og prissetting ble verifisert. Vekt/periferi ble bekreftet OK manuelt av bruker. Se `test-artifacts/executions/HC-004-20260515-115652.md`.
