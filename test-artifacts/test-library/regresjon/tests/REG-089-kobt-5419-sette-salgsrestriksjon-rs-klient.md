# REG-089 Sette salgsrestriksjon - RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5419 - https://norgesgruppen.atlassian.net/browse/KOBT-5419
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Sette salgsrestriksjon i RS Klient og verifisere POS-oppdatering.

## Preconditions

- RS Klient og POS-integrasjon tilgjengelig.

## Test Data

- Salgsrestriksjonsdata.

## Steps

1. Endre salgsrestriksjon i RS Klient.
   Expected: Endringen lagres i RS.
2. Verifiser i POS.
   Expected: Endringen oppdateres og håndheves i POS.

## Pass Criteria

Testen passerer nar salgsrestriksjon lagres og oppdateres i POS.

## Fail Criteria

Testen feiler hvis POS ikke oppdateres eller restriksjon ikke håndheves.

## Blockers / Risks

- Aktiv blocker-defekt BUT-5203: endringer oppdaterer ikke POS.
- Jira-steg/testdata mangler.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5419 2026-05-07. Ingen execution er utfort ved import.