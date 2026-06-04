# REG-056 Legge til produsentens LOT nummer i en produksjon

Set: Regresjon
Default environment: Test
Source reference: KOBT-3629 - https://norgesgruppen.atlassian.net/browse/KOBT-3629
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere produsentens LOT-nummer i produksjon.

## Preconditions

- Tilgang til produksjonsmodul og sporingslogg.

## Test Data

- Ingrediens med produsentens LOT-nummer.

## Steps

1. Under plukking av ingredienser, legg inn LOT-nummer i fritekstfelt.
   Expected: LOT-nummer kan lagres.
2. Åpne sporingslogg i RS.
   Expected: LOT-nummer er synlig i sporingslogg.

## Pass Criteria

Testen passerer nar LOT-nummer kan registreres og ses i sporingslogg.

## Fail Criteria

Testen feiler hvis LOT-felt mangler, ikke lagres eller ikke vises i logg.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3629 2026-05-07. Ingen execution er utfort ved import.