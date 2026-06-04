# REG-029 Butikkoverføring ulik Juridisk (ekstern)

Set: Regresjon
Default environment: Test
Source reference: KOBT-3429 - https://norgesgruppen.atlassian.net/browse/KOBT-3429
Area: Overføring
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Gjennomføre butikkoverføring til butikk i ulik juridisk enhet og validere EHF.

## Preconditions

- Tilgang til RS hos avsender og mottaker.
- Fakturaflyt/EHF-verifikasjon tilgjengelig.

## Test Data

- Vare og mottakerbutikk i annen juridisk enhet.

## Steps

1. Opprett vareoverføring til butikk i ulik juridisk enhet.
   Expected: Overføring kan opprettes og sendes.
2. Verifiser i RS hos avsender og mottaker.
   Expected: Begge butikker viser korrekt overføring.
3. Verifiser Bong til NG-flyt.
   Expected: Flyt til NG er korrekt.
4. Verifiser EHF-faktura.
   Expected: EHF-faktura opprettes korrekt.

## Pass Criteria

Testen passerer nar ekstern overføring og EHF-faktura er korrekt.

## Fail Criteria

Testen feiler hvis overføring/flyt/faktura mangler eller er feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere i Jira.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3429 2026-05-07. Ingen execution er utfort ved import.