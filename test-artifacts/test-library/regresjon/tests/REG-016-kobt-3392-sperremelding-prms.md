# REG-016 Sperremelding PRMS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3392 - https://norgesgruppen.atlassian.net/browse/KOBT-3392
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Validere sperremelding fra PRMS til RS, RS Store og POS, inkludert oppheving.

## Preconditions

- Precondition KOBT-4051 ma gjennomfores for bestilling av sperremelding.
- Tilgang til RS Connector, RS Store og POS.

## Test Data

- Sperremelding.
- 2-3 artikler med EPD/bestillingsnummer og GTIN.
- Butikk.

## Steps

1. Bestill sperremelding.
   Expected: Sperremelding sendes fra PRMS.
2. Verifiser mottak i RS Connector.
   Expected: Sperremelding er mottatt i connector-flyt.
3. Verifiser mottak i RS Store og bekreft meldingen.
   Expected: Varen markeres som sperret i RS Store.
4. Verifiser varen i POS.
   Expected: Varen er sperret og kan ikke selges.
5. Be om oppheving av sperre og verifiser mottak i RS Connector og RS Store.
   Expected: Oppheving mottas og varen frigis.
6. Verifiser varen i POS etter oppheving.
   Expected: Varen kan selges i POS.

## Pass Criteria

Testen passerer nar sperre og oppheving flyter korrekt gjennom PRMS, Connector, RS Store og POS.

## Fail Criteria

Testen feiler hvis varen ikke sperres, ikke frigis, eller POS ikke reflekterer korrekt status.

## Blockers / Risks

- Avhengig av ekstern PRMS-bestilling via KOBT-4051.
- Krever POS-integrasjon.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3392 2026-05-07. Ingen execution er utfort ved import.