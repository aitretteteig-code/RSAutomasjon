# HC-015 INT-003 SAP til RS

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3583 - https://norgesgruppen.atlassian.net/browse/KOBT-3583
Area: Integrasjon / Pris
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at prisendring gjort i SAP flyter via RS Connector og PreProcessor til RS Store.

## Preconditions

- Pre-condition KOBT-4045 må være oppfylt.
- Tilgang til SAP artikkel- og prisarbeidsbenk.
- Tilgang til RS Connector, PreProcessor og RS Store.
- SAP-miljo: Test = R3T, Stage = R3Q.

## Test Data

- Kjede: Meny.
- Vare: Avklares ved execution.
- Ny pris: Avklares ved execution.

## Environment Paths

RS Test:

- Connector: `\\ngvrspreproc01u\d$\RSConnector-Data\RsConnectorArticlesToVismaRS`
- PreProcessor: `\\ngvrspreproc01u\d$\PreProcessor\Output`

RS Stage:

- Connector: `\\NGVRSPREPRST01P\d$\RSConnector-Data\RsConnectorArticlesToVismaRS`
- PreProcessor: `\\NGVRSPREPRST01P\d$\PreProcessor\Output`

## Steps

1. I SAP artikkel- og prisarbeidsbenk, gjør en prisendring på en Meny-vare.
   Expected: Prisendringen lagres i riktig SAP-miljo.
2. Verifiser at fil mottas i RS Connector.
   Expected: Fil finnes i connector-path for valgt miljo.
3. Verifiser at fil er i PreProcessor output.
   Expected: Fil finnes i PreProcessor output for valgt miljo.
4. Verifiser at artikkel er oppdatert i RS Store med ny pris.
   Expected: RS Store viser oppdatert pris.

## Pass Criteria

Testen passerer nar SAP-prisendringen er verifisert i connector, preprocessor og RS Store.

## Fail Criteria

Testen feiler hvis fil ikke mottas, ikke prosesseres, eller pris ikke oppdateres i RS Store.

## Blockers / Risks

- Krever SAP-tilgang og tilgang til serverstier.

## Notes

Ingen execution er utfort ved import.
