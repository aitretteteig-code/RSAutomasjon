# REG-030 Butikkoverføring mellom avdeling (MENY)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3430 - https://norgesgruppen.atlassian.net/browse/KOBT-3430
Area: Overføring
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Gjennomføre butikkoverføring mellom avdelinger i MENY.

## Preconditions

- Tilgang til RS for avsender- og mottakeravdeling.

## Test Data

- Vare og mottakeravdeling.

## Steps

1. Opprett overføring av vare fra en avdeling til en annen.
   Expected: Overføring opprettes og sendes.
2. Verifiser i RS hos mottakeravdeling.
   Expected: Overføring er synlig hos mottaker.

## Pass Criteria

Testen passerer nar avdelingsoverføring sendes og vises hos mottaker.

## Fail Criteria

Testen feiler hvis overføring ikke sendes eller ikke vises hos mottaker.

## Blockers / Risks

- Jira har begrensede detaljer.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3430 2026-05-07. Ingen execution er utfort ved import.