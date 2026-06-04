# REG-028 Butikkoverføring Samme Juridiske (Intern)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3428 - https://norgesgruppen.atlassian.net/browse/KOBT-3428
Area: Overføring
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Gjennomføre butikkoverføring til butikk i samme juridiske enhet.

## Preconditions

- Tilgang til RS hos avsender og mottaker.
- Tilgang til NG-flyt/verifikasjon.

## Test Data

- Vare og mottakerbutikk i samme juridiske enhet.

## Steps

1. Opprett vareoverføring til butikk i samme juridiske enhet.
   Expected: Overføring kan opprettes og sendes.
2. Verifiser i RS hos avsender.
   Expected: Avsender viser korrekt overføring.
3. Verifiser i RS hos mottaker.
   Expected: Mottaker viser korrekt overføring.
4. Verifiser Bong til NG-flyt.
   Expected: Flyt til NG er korrekt.

## Pass Criteria

Testen passerer nar overføring sendes og verifiseres hos avsender, mottaker og NG-flyt.

## Fail Criteria

Testen feiler hvis overføring ikke kan lukkes/sendes eller verifikasjon feiler.

## Blockers / Risks

- Åpen critical defect BUT-2080 på lukking av samme-juridisk overføring.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3428 2026-05-07. Ingen execution er utfort ved import.