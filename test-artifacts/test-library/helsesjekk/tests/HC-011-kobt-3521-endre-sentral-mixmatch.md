# HC-011 Endring av sentral Mixmatch fra SAP

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3521 - https://norgesgruppen.atlassian.net/browse/KOBT-3521
Area: Kampanje / SAP
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at endring av eksisterende sentral Mixmatch/BonusBuy i SAP flyter til RS Connector, RS Store og POS.

## Preconditions

- Eksisterende Mixmatch fra tidligere test må være tilgjengelig.
- Pre-condition KOBT-4049 må være oppfylt.
- Tilgang til SAP, RS Connector, RS Store og POS.

## Test Data

- Eksisterende Mixmatch/BonusBuy: Avklares ved execution.

## Steps

1. Endre eksisterende Mixmatch/BonusBuy i SAP.
   Expected: Endringen lagres i SAP.
2. Verifiser at endringen kommer inn til RS Connector.
   Expected: Endringen mottas i connector.
3. Verifiser Mixmatch i RS Store.
   Expected: RS Store viser oppdatert Mixmatch.
4. Verifiser Mixmatch i POS.
   Expected: POS gir forventet effekt etter endringen.

## Pass Criteria

Testen passerer nar endret Mixmatch er verifisert i RS Connector, RS Store og POS.

## Fail Criteria

Testen feiler hvis endringen ikke flyter eller POS-resultat ikke stemmer.

## Blockers / Risks

- Avhengig av eksisterende Mixmatch og SAP-/POS-tilgang.

## Notes

Ingen execution er utfort ved import.

Automation note 2026-05-19: HC-011 kjores som del av samlet kampanjeflyt i `test-artifacts/playwright/tests/hc-008-hc-009-hc-010-hc-011-campaign-flow.spec.js`. Samme kjøring dekker opprettelse av kundeavis (HC-008), opprettelse av BonusBuy/Mixmatch (HC-009), endring av kundeavis (HC-010) og endring av BonusBuy/Mixmatch (HC-011). Portalen viser ferdig meldingsutkast, manuelle stopp for SAP/RS Connector/POS og Playwright-kontroll av RS Store.
