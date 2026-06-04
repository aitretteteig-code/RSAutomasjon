# HC-001 Sperremelding PRMS

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3392 - https://norgesgruppen.atlassian.net/browse/KOBT-3392
Area: Integrasjon / POS
Priority: Normal
Status: BLOCKED
Documentation status: Ready, based on Jira description

## Objective

Verifisere at sperremelding fra PRMS mottas i RS, behandles riktig, sperrer varen i POS, og at oppheving av sperre fungerer.

## Preconditions

- Sperremelding bestilles via pre-condition KOBT-4051.
- Tilgang til RS Connector, RS Store og POS.
- Testvare som kan sperres og senere frigis.

## Test Data

- Vare: Avklares ved execution.
- Miljo: Test med mindre annet er angitt.

## Steps

1. Bestill sperremelding.
   Expected: Sperremelding er sendt fra PRMS.
2. Verifiser at sperremelding mottas i RS Connector.
   Expected: Meldingen er tilgjengelig i connector-flyt.
3. Verifiser at sperremelding mottas i RS Store og bekreft den.
   Expected: Varen markeres som sperret i RS Store.
4. Verifiser at varen er sperret i POS.
   Expected: Varen kan ikke selges i POS.
5. Be om oppheving av sperre via samme ressurs/prosess.
   Expected: Opphevingsmelding sendes.
6. Verifiser at oppheving mottas i RS Connector.
   Expected: Opphevingsmelding er mottatt.
7. Verifiser at oppheving mottas i RS Store.
   Expected: Varen er ikke lenger sperret i RS Store.
8. Verifiser at varen kan selges i POS.
   Expected: Salg kan gjennomfores.

## Pass Criteria

Testen passerer nar sperre og oppheving flyter gjennom RS Connector, RS Store og POS som forventet.

## Fail Criteria

Testen feiler hvis varen ikke sperres, ikke frigis, eller hvis POS ikke reflekterer korrekt sperrestatus.

## Blockers / Risks

- Avhengig av pre-condition KOBT-4051.
- Krever POS-integrasjon.

## Notes

Ingen execution er utfort ved import.

Execution 2026-05-07: Testen er startet. PRMS-sending ble bekreftet av Geir, men RS Store viser fortsatt ingen ny tilbakekalling for valgte artikler, og artikkeldata viser `recallId: null`. Testen er fortsatt BLOCKED, naa paa "ikke mottatt/synlig i RS Store". Se `test-artifacts/executions/HC-001-20260507-094937.md` for detaljer og ferdig oppfolgingsmelding.

Automation note 2026-05-19: HC-001 kjores som hybridtest i portalen via `test-artifacts/playwright/tests/hc-001-sperremelding-prms.spec.js`. Playwright velger et varierende vareforslag fra RS Store ved oppstart og viser et meldingsutkast som kan sendes til Geir. PRMS, RS Connector og POS verifiseres som tydelige manuelle stoppunkter i portalen med Gjennomfort/Feilet. Playwright bruker recall-id/tittel/vare fra notatfeltet, eller vareforslaget, til aa finne, verifisere og bekrefte sperremeldingen i RS Store, og til aa verifisere oppheving i RS Store etter frigivelse. De eldre HC-001-spesifikasjonene for recall-list/API/filter er kun stotte/inspeksjon.
