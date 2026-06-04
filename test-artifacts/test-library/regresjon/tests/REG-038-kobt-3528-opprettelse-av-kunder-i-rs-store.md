# REG-038 Opprettelse av Kunder i RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3528 - https://norgesgruppen.atlassian.net/browse/KOBT-3528
Area: Kunde
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Opprette ulike kundetyper i RS Store.

## Preconditions

- Tilgang til RS Store.

## Test Data

- Privatperson.
- Firmakunde.
- Privatperson med papirfaktura.

## Steps

1. Opprett privatperson i RS Store.
   Expected: Kunden opprettes.
2. Opprett firmakunde i RS Store.
   Expected: Kunden opprettes.
3. Opprett privatperson med papirfaktura.
   Expected: Kunden opprettes med korrekt fakturatype.

## Pass Criteria

Testen passerer nar alle kundetypene opprettes korrekt.

## Fail Criteria

Testen feiler hvis en kundetype ikke kan opprettes eller lagres feil.

## Blockers / Risks

- Jira mangler detaljerte expected-resultater.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3528 2026-05-07. Ingen execution er utfort ved import.