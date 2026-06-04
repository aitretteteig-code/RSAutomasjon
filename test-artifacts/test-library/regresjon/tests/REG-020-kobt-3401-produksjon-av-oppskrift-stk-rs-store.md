# REG-020 Produksjon av oppskrift (STK) RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3401 - https://norgesgruppen.atlassian.net/browse/KOBT-3401
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Produsere STK-oppskrift i RS Store og verifisere pris, deklarasjon og vekt.

## Preconditions

- Tilgang til RS Store.
- Tilgang til vekt dersom vektverifisering skal utføres.

## Test Data

- Eksempelvarer: COLESLAW SIDEORDER PR STK - 1537.
- BRUN LAPSKAUS M/FLATBRØD PR STK - 9451.
- BROKKOLISALAT M/BRINGEBÆR PR STK - 8964.

## Steps

1. Gjor en produksjon av en STK-oppskrift i RS Store.
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

- Krever egnede STK-oppskrifter og vekt for full verifisering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3401 2026-05-07. Ingen execution er utfort ved import.