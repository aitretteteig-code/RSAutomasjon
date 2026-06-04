# HC-009 Mixmatch BonusBuy

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3423 - https://norgesgruppen.atlassian.net/browse/KOBT-3423
Area: Kampanje / SAP
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at Mixmatch/BonusBuy opprettet i SAP flyter til RS Connector, RS Store og POS.

## Preconditions

- Pre-condition KOBT-4047 må være oppfylt.
- Tilgang til SAP, RS Connector, RS Store og POS.

## Test Data

- Mixmatch/BonusBuy: Opprettes i SAP ved execution.
- Artikler: Avklares ved execution.

## Steps

1. Opprett Mixmatch/BonusBuy i SAP.
   Expected: Mixmatch lagres i SAP.
2. Verifiser at den kommer inn til RS Connector.
   Expected: Data mottas i connector.
3. Verifiser Mixmatch i RS Store.
   Expected: Mixmatch finnes med korrekt oppsett.
4. Verifiser Mixmatch i POS.
   Expected: POS gir forventet bonus/kampanjeeffekt.

## Pass Criteria

Testen passerer nar Mixmatch er verifisert i SAP, RS Connector, RS Store og POS.

## Fail Criteria

Testen feiler hvis flyten stopper eller POS ikke gir forventet resultat.

## Blockers / Risks

- Krever SAP- og POS-integrasjon.

## Notes

Ingen execution er utfort ved import.

Automation note 2026-05-19: HC-009 kjores som del av samlet kampanjeflyt i `test-artifacts/playwright/tests/hc-008-hc-009-hc-010-hc-011-campaign-flow.spec.js`. Samme kjøring dekker opprettelse av kundeavis (HC-008), opprettelse av BonusBuy/Mixmatch (HC-009), endring av kundeavis (HC-010) og endring av BonusBuy/Mixmatch (HC-011). Portalen viser ferdig meldingsutkast, manuelle stopp for SAP/RS Connector/POS og Playwright-kontroll av RS Store.
