# HC-018 Gjennomgang av koer pa monitor

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-6117 - https://norgesgruppen.atlassian.net/browse/KOBT-6117
Area: Monitor / Koer
Priority: Needs detail
Status: NOT RUN
Documentation status: Needs detail - Jira description is empty

## Objective

Gå gjennom køer på monitor og avdekke eventuelle feil, stopp eller ubehandlede meldinger.

## Preconditions

- Tilgang til relevant monitorløsning.
- Liste over hvilke køer som skal sjekkes må avklares.
- Akseptkriterier for tom kø, poison queue og varselgrenser må avklares.

## Test Data

- Monitor: Avklares.
- Køer: Avklares.

## Steps

1. Åpne monitor for valgt miljo.
   Expected: Monitor er tilgjengelig.
2. Gå gjennom avklarte køer.
   Expected: Køstatus kan leses.
3. Noter køer med feil, stopp eller uventet volum.
   Expected: Avvik dokumenteres med navn, volum og tidspunkt.
4. Verifiser at kritiske køer er uten ubehandlede feil.
   Expected: Ingen kritiske avvik, eller avvik er dokumentert.

## Pass Criteria

Må avklares. Foreslått: Ingen kritiske køer med ubehandlede feil eller stopp.

## Fail Criteria

Må avklares. Foreslått: Kritisk kø har feil/stopp som påvirker RetailSuite-flyt.

## Blockers / Risks

- Jira har ingen beskrivelse utover tittel.
- Trenger konkret liste over køer og grenseverdier.

## Notes

Ingen execution er utfort ved import.
