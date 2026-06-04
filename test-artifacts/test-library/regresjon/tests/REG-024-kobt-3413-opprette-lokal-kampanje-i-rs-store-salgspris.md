# REG-024 Opprette Lokal kampanje i RS Store (Salgspris)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3413 - https://norgesgruppen.atlassian.net/browse/KOBT-3413
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette lokal salgspriskampanje i RS Store og validere varekort, POS, ESL og rapport.

## Preconditions

- ESL-brikke må være linket på forhånd.
- Tilgang til RS Store, POS, ESL og kampanjerapport.

## Test Data

- Vare for lokal salgspriskampanje.

## Steps

1. Opprett lokal salgspriskampanje i RS Store.
   Expected: Kampanjen lagres.
2. Verifiser varekort.
   Expected: Varekort har kampanjemarkering og kampanje-ID.
3. Gjennomfør salg i POS.
   Expected: Kampanjepris brukes korrekt.
4. Verifiser ESL og kampanjerapport.
   Expected: ESL og rapport viser forventet kampanjeinformasjon.

## Pass Criteria

Testen passerer nar kampanje vises korrekt på varekort, POS, ESL og rapport.

## Fail Criteria

Testen feiler hvis kampanje ikke opprettes eller en verifikasjon er feil.

## Blockers / Risks

- Åpen defect BUT-5252 på kampanjenavn i rapport kan påvirke rapportvalidering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3413 2026-05-07. Ingen execution er utfort ved import.