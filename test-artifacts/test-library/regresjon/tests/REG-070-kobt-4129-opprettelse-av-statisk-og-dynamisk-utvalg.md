# REG-070 Opprettelse av statisk og dynamisk utvalg

Set: Regresjon
Default environment: Test
Source reference: KOBT-4129 - https://norgesgruppen.atlassian.net/browse/KOBT-4129
Area: Utvalg
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette statisk og dynamisk utvalg i RS.

## Preconditions

- Tilgang RS og varer til utvalg.

## Test Data

- Varer til dynamisk og statisk utvalg.

## Steps

1. Finn utvalg i RS og trykk opprett dynamisk.
   Expected: Dynamisk utvalg kan opprettes.
2. Legg til varer og lagre.
   Expected: Dynamisk utvalg lagres.
3. Trykk opprett statisk, legg til varer og lagre.
   Expected: Statisk utvalg lagres.
4. Sjekk at begge utvalgene er opprettet.
   Expected: Begge utvalg finnes.

## Pass Criteria

Testen passerer nar statisk og dynamisk utvalg opprettes og lagres.

## Fail Criteria

Testen feiler hvis et utvalg ikke kan opprettes eller ikke finnes etter lagring.

## Blockers / Risks

- Ingen tydelige blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4129 2026-05-07. Ingen execution er utfort ved import.