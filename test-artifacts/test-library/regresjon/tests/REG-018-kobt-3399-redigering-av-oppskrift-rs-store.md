# REG-018 Redigering av oppskrift RS store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3399 - https://norgesgruppen.atlassian.net/browse/KOBT-3399
Area: Oppskrift
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Redigere oppskrift i RS Store og validere lagring, produksjon og deklarasjon.

## Preconditions

- Tilgang til RS Store.
- Eksisterende KG- og STK-oppskrifter tilgjengelig.

## Test Data

- En KG-oppskrift.
- En STK-oppskrift.
- Ingredienser som kan legges til/fjernes.

## Steps

1. Søk opp en oppskrift i RS Store.
   Expected: Oppskriften finnes og kan apnes for redigering.
2. Legg til og fjern ingredienser.
   Expected: Endringer kan gjores uten feil.
3. Lagre oppskriften.
   Expected: Oppskriften lagres med endringene.
4. Gjenta for bade KG- og STK-oppskrift.
   Expected: Begge oppskriftstyper kan redigeres og lagres.
5. Gjor produksjon basert pa redigert oppskrift.
   Expected: Produksjon kan gjennomfores.
6. Verifiser deklarasjon.
   Expected: Deklarasjon oppdateres korrekt.

## Pass Criteria

Testen passerer nar KG- og STK-oppskrift kan endres, lagres og produseres med korrekt deklarasjon.

## Fail Criteria

Testen feiler hvis redigering ikke lagres, produksjon stopper, eller deklarasjon ikke oppdateres korrekt.

## Blockers / Risks

- Krever egnede oppskrifter med ingredienser som kan endres.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3399 2026-05-07. Ingen execution er utfort ved import.