# HC-010 Endring av sentral kampanje fra SAP

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3520 - https://norgesgruppen.atlassian.net/browse/KOBT-3520
Area: Kampanje / SAP
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at endring av en eksisterende sentral kampanje i SAP flyter til RS Connector, RS Store og POS.

## Preconditions

- Eksisterende kampanje fra tidligere test må være tilgjengelig.
- Pre-condition KOBT-4048 må være oppfylt.
- Tilgang til SAP arbeidsbenk, RS Connector, RS Store og POS.

## Test Data

- Eksisterende kampanje: Avklares ved execution.
- Artikler som legges til/fjernes: Avklares ved execution.

## Steps

1. Finn eksisterende kampanje i SAP arbeidsbenk.
   Expected: Kampanjen finnes.
2. Endre kampanjen ved å legge til artikler.
   Expected: Endringen lagres i SAP.
3. Endre kampanjen ved å fjerne artikler.
   Expected: Endringen lagres i SAP.
4. Verifiser at kampanjen kommer til RS Connector.
   Expected: Endret kampanje mottas i connector.
5. Verifiser at kampanjen er oppdatert i RS Store.
   Expected: RS Store viser korrekt kampanjeinnhold.
6. Verifiser i POS.
   Expected: POS reflekterer endret kampanje.

## Pass Criteria

Testen passerer nar kampanjeendringer vises korrekt i RS Connector, RS Store og POS.

## Fail Criteria

Testen feiler hvis kampanjeendringene ikke kommer frem eller ikke gir forventet POS-resultat.

## Blockers / Risks

- Avhengig av eksisterende kampanje og SAP-tilgang.

## Notes

Ingen execution er utfort ved import.

Automation note 2026-05-19: HC-010 kjores som del av samlet kampanjeflyt i `test-artifacts/playwright/tests/hc-008-hc-009-hc-010-hc-011-campaign-flow.spec.js`. Samme kjøring dekker opprettelse av kundeavis (HC-008), opprettelse av BonusBuy/Mixmatch (HC-009), endring av kundeavis (HC-010) og endring av BonusBuy/Mixmatch (HC-011). Portalen viser ferdig meldingsutkast, manuelle stopp for SAP/RS Connector/POS og Playwright-kontroll av RS Store.
