# REG-091 RSClient - Set migrated to yes

Set: Regresjon
Default environment: Test
Source reference: KOBT-5741 - https://norgesgruppen.atlassian.net/browse/KOBT-5741
Area: RS Klient
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

RSClient: sette migrated til yes.

## Preconditions

- RS Klient tilgjengelig.
- Prosess dokumentert eksternt i Confluence.

## Test Data

- Migrerings-/regnskapsrelatert data.

## Steps

1. Hent og følg prosess for Set migrated to yes.
   Expected: Riktig prosessgrunnlag er avklart.
2. Sett migrated til yes i RS Client.
   Expected: Migrated settes til yes.

## Pass Criteria

Testen passerer nar migrated settes til yes iht. prosess.

## Fail Criteria

Testen feiler hvis verdien ikke kan settes eller ikke lagres.

## Blockers / Risks

- Jira peker til Confluence-side for detaljer; detaljerte Jira-steg/testdata mangler.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5741 2026-05-07. Ingen execution er utfort ved import.