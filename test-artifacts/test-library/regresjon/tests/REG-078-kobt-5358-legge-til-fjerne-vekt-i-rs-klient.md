# REG-078 Legge til/fjerne vekt i RS Klient

Set: Regresjon
Default environment: Test
Source reference: KOBT-5358 - https://norgesgruppen.atlassian.net/browse/KOBT-5358
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Legge til og fjerne vekt i RS Klient.

## Preconditions

- Miljø og fysisk/logisk vekt som kan brukes.

## Test Data

- Vektkonfigurasjon.

## Steps

1. Legg til vekt i RS Klient.
   Expected: Vektkonfigurasjon lagres.
2. Verifiser flyt/konfigurasjon.
   Expected: Vekten er tilgjengelig der forventet.
3. Fjern vekt i RS Klient.
   Expected: Vekt fjernes og konfigurasjon oppdateres.

## Pass Criteria

Testen passerer nar vekt kan legges til og fjernes med korrekt flyt.

## Fail Criteria

Testen feiler hvis vektkonfigurasjon ikke lagres eller flyter.

## Blockers / Risks

- Jira har kun precondition, ikke konkrete steg.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5358 2026-05-07. Ingen execution er utfort ved import.