# HC-008 Opprettelse av kundeavis kampanje

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3421 - https://norgesgruppen.atlassian.net/browse/KOBT-3421
Area: Kampanje / SAP
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at kundeavis-kampanje opprettet i SAP flyter til RS Connector, RS Store og POS.

## Preconditions

- Pre-condition BUT-4046/KOBT-4046 må avklares før execution.
- Tilgang til SAP arbeidsbenk, RS Connector, RS Store og POS.

## Test Data

- Kampanje: Opprettes i SAP ved execution.
- Artikler: Avklares ved execution.

## Steps

1. Opprett kundeavis-kampanje i SAP.
   Expected: Kampanjen lagres i SAP.
2. Verifiser at kampanjen kommer inn til RS Connector.
   Expected: Kampanjegrunnlag mottas i connector.
3. Verifiser kampanjen i RS Store.
   Expected: Kampanjen finnes og har korrekt innhold.
4. Verifiser kampanjen i POS.
   Expected: POS bruker kampanje/pris som forventet.

## Pass Criteria

Testen passerer nar kampanjen er verifisert i SAP, RS Connector, RS Store og POS.

## Fail Criteria

Testen feiler hvis kampanjen ikke flyter til RS eller ikke slår inn i POS.

## Blockers / Risks

- Krever SAP- og POS-tilgang.
- Pre-condition referansen i Jira har både BUT-4046 og KOBT-4046-varianter; avklar riktig nøkkel ved execution.

## Notes

Ingen execution er utfort ved import.

Automation note 2026-05-19: HC-008 kjores som del av samlet kampanjeflyt i `test-artifacts/playwright/tests/hc-008-hc-009-hc-010-hc-011-campaign-flow.spec.js`. Samme kjøring dekker opprettelse av kundeavis (HC-008), opprettelse av BonusBuy/Mixmatch (HC-009), endring av kundeavis (HC-010) og endring av BonusBuy/Mixmatch (HC-011). Portalen viser ferdig meldingsutkast, manuelle stopp for SAP/RS Connector/POS og Playwright-kontroll av RS Store.
