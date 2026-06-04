# REG-054 Opptint Dato oppskriftsvare

Set: Regresjon
Default environment: Test
Source reference: KOBT-3624 - https://norgesgruppen.atlassian.net/browse/KOBT-3624
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere opptint dato på oppskriftsvare/batch.

## Preconditions

- Tilgang til batch/produksjon.
- Tilgang til ferskvarevekt/traceability hvis full verifisering skal utføres.

## Test Data

- Batch/oppskriftsvare med opptint dato.

## Steps

1. Opprett eller rediger batch med opptint dato.
   Expected: Default dato foreslås som dagens dato.
2. Sett opptint dato bakover og fremover i tid.
   Expected: Begge deler tillates.
3. Verifiser traceability-format og eksport til vekt.
   Expected: Opptint dato inngår i format og sendes til vekt.

## Pass Criteria

Testen passerer nar opptint dato kan settes og eksporteres korrekt.

## Fail Criteria

Testen feiler hvis dato ikke kan settes eller ikke inngår i sporing/vekt.

## Blockers / Risks

- Aktive defects BUT-4612 og BUT-5206 kan påvirke rapport/batchflyt.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3624 2026-05-07. Ingen execution er utfort ved import.