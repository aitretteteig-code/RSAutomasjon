# REG-021 Varesøknad fra RS til SAP

Set: Regresjon
Default environment: Test
Source reference: KOBT-3404 - https://norgesgruppen.atlassian.net/browse/KOBT-3404
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere varesøknad fra RS til SAP og tilbake til RS/POS.

## Preconditions

- Tilgang til RS, SAP R3T og POS.
- SAP-ressurs/kontakt ma kunne godkjenne varesøknad.

## Test Data

- Ny vare/GTIN.
- GTIN-generator nevnt i Jira.
- Salgspris og innkjøpspris for varen.

## Steps

1. Send inn en varesøknad fra RS til SAP.
   Expected: Søknaden sendes fra RS.
2. Verifiser i SAP at søknaden er mottatt.
   Expected: Søknaden finnes i SAP R3T.
3. Godkjenn søknaden i SAP.
   Expected: Svar sendes tilbake til RS.
4. Verifiser svar i RS og at artikkel er synlig.
   Expected: Artikkelen er opprettet/synlig i RS.
5. Sett innkjøpspris og salgspris, og verifiser salg i POS.
   Expected: Varen kan selges i POS med pris.

## Pass Criteria

Testen passerer nar varesøknad flyter RS -> SAP -> RS, varen blir synlig, prises og kan selges i POS.

## Fail Criteria

Testen feiler hvis søknad, godkjenning, retur, prissetting eller POS-salg ikke fungerer.

## Blockers / Risks

- Krever SAP-tilgang/ressurs.
- Testmiljø: SAP R3T for Test.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3404 2026-05-07. Ingen execution er utfort ved import.