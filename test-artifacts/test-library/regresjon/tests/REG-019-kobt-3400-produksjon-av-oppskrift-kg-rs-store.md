# REG-019 Produksjon av oppskrift (KG) RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3400 - https://norgesgruppen.atlassian.net/browse/KOBT-3400
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Produsere KG-oppskrift i RS Store og verifisere pris, deklarasjon og vekt.

## Preconditions

- Tilgang til RS Store.
- Tilgang til vekt dersom vektverifisering skal utføres.

## Test Data

- Eksempelvarer: LAM YTREFILET MARINERT PR KG - 7239.
- TIKKA MASALA M/KJØTT PR KG - 5175.
- BUTTER CHICKEN BUTTER CHICKEN PR KG - 1621.

## Steps

1. Gjor en produksjon av en KG-oppskrift i RS Store.
   Expected: Produksjonen kan gjennomfores.
2. Verifiser nettopris.
   Expected: Nettopris oppdateres korrekt.
3. Verifiser næringsdeklarasjon.
   Expected: Næringsdeklarasjon oppdateres og settes som standard.
4. Verifiser varen pa vekt.
   Expected: Varen vises pa vekt med korrekt pris og deklarasjon.

## Pass Criteria

Testen passerer nar produksjon, nettopris, deklarasjon og vektvisning er korrekt.

## Fail Criteria

Testen feiler hvis produksjon ikke kan gjennomfores eller pris/deklarasjon/vekt ikke oppdateres korrekt.

## Blockers / Risks

- Krever egnede KG-oppskrifter og vekt for full verifisering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3400 2026-05-07. Ingen execution er utfort ved import.