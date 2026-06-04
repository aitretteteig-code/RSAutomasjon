# HC-006 Opprette ordre i Meny Preprod

Set: Helsesjekk
Default environment: Preprod
Source reference: KOBT-3417 - https://norgesgruppen.atlassian.net/browse/KOBT-3417
Source issue type: Pre-Condition
Area: Pick & Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette en ordre i Meny Preprod for å teste flyt til RS Pick & Collect.

## Preconditions

- Tilgang til preprod.meny.no eller preprod.spar.no.
- Testbruker og testbetalingsmiddel må hentes fra godkjent credential-store av testleder/tester.
- Ikke lagre kortdetaljer eller hemmeligheter i testartefakter.

## Test Data

- Nettbutikk: https://menyweb.trumffrontend.systest.trumf.cloud/
- Alternativ nettbutikk: http://preprod.spar.no
- Varer: Valgfritt testutvalg.

## Steps

1. Åpne PREPROD Meny.no.
   Expected: Nettbutikken åpnes.
2. Legg til varer i handlekurv.
   Expected: Handlekurv oppdateres.
3. Gå til kassen.
   Expected: Kasseflyt åpnes.
4. Trykk neste og velg dato for henting.
   Expected: Hentedato kan velges.
5. Legg inn godkjent testkort fra credential-store, trykk `Betal`, og trykk deretter `Authenticate` for å bekrefte bestillingen.
   Expected: Ordre opprettes.
6. Verifiser flyt til RS Pick & Collect hvis denne testen brukes som forutsetning.
   Expected: Ordren blir tilgjengelig i RS Pick & Collect.

## Pass Criteria

Testen passerer nar ordre kan opprettes og ved behov ses i RS Pick & Collect.

## Fail Criteria

Testen feiler hvis ordre ikke kan opprettes eller ikke flyter videre til RS der dette skal verifiseres.

## Blockers / Risks

- Krever gyldig testbruker og testbetalingsmiddel.
- Dette er Jira-type Pre-Condition, men er lagt inn i helsesjekk fordi den var med i brukerens liste.

## Notes

Ingen execution er utfort ved import.

Automation learning 2026-05-18: I 3DS-simulatoren må testen eksplisitt velge responsen `Authenticated`. Ikke godkjenn flyten basert på generiske kontroller som `Continue`, `OK` eller at et auth-klikk bare er forsøkt. Meny-delen er først vellykket når bekreftelsessiden `/kassen/bekreftelse` vises og ordrenummer er fanget.

Automation learning 2026-05-19: Etter betaling skal HC-006 vente på siden `TAKK FOR BESTILLINGEN!`, hente feltet `Ordrenummer`, og bruke akkurat dette nummeret når ordren søkes opp i RS Pick & Collect. Testen skal ikke starte RS-verifisering før bekreftelsessiden og ordrenummeret er observert.
