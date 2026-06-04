# REG-041 1142 Varesalgswidget

Set: Regresjon
Default environment: Test
Source reference: KOBT-3538 - https://norgesgruppen.atlassian.net/browse/KOBT-3538
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport/widget 1142 Varesalgswidget, inkludert lastetid og datoparametre.

## Preconditions

- Tilgang til RS Store.
- Varer med salgsdata finnes.

## Test Data

- Flere varer.
- Datoområder: siste uke, mindre enn en måned, tre måneder eller mer, siste 30 dager.

## Steps

1. Søk opp en vare og mål lastetid for varesalgswidget.
   Expected: Widget laster innen akseptabel tid.
2. Endre datoparametre til siste uke eller mindre enn en måned og søk opp ny vare.
   Expected: Widget viser nye datoer korrekt.
3. Endre datoparametre til siste tre måneder eller mer og søk opp ny vare.
   Expected: Widget viser nye datoer korrekt.
4. Sett parameter tilbake til siste 30 dager.
   Expected: Standard/ønsket periode er gjenopprettet.

## Pass Criteria

Testen passerer nar widget laster og datoparametre gir korrekt visning.

## Fail Criteria

Testen feiler hvis widget ikke laster, bruker feil datoer eller blir hengende.

## Blockers / Risks

- Datoendringer lagres som brukerstandard og må ryddes tilbake.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3538 2026-05-07. Ingen execution er utfort ved import.