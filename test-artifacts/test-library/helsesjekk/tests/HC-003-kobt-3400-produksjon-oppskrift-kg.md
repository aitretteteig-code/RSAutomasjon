# HC-003 Produksjon av oppskrift KG

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3400 - https://norgesgruppen.atlassian.net/browse/KOBT-3400
Area: Oppskrift / Produksjon
Priority: Normal
Status: PASSED
Documentation status: Ready, based on Jira description and prior team memory

## Objective

Verifisere produksjon av KG-oppskrift i RS Store og at pris, deklarasjon og vektvisning oppdateres korrekt.

## Preconditions

- Tilgang til RS Store.
- Tilgang til vekt/periferi hvis full ende-til-ende-verifisering skal gjores.
- Egnet KG-oppskrift finnes i butikken.

## Test Data

Eksempelvarer fra Jira:

- LAM YTREFILET MARINERT PR KG - 7239
- TIKKA MASALA M/KJOTT PR KG - 5175
- BUTTER CHICKEN BUTTER CHICKEN PR KG - 1621

## Steps

1. Åpne RS Store og finn en av KG-oppskriftene.
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

Execution 2026-05-15: RS Store-delen passerte med Playwright for `757709 - LAM YTREFILET MARINERT PR KG`, produksjon `19607`. Plukk, aktiv produksjonsdeklarasjon og prissetting ble verifisert. Vekt/periferi ble bekreftet OK manuelt av bruker. Se `test-artifacts/executions/HC-003-20260515-113105.md`.
