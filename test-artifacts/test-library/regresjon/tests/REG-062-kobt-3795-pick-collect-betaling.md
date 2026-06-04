# REG-062 Pick&Collect_Betaling

Set: Regresjon
Default environment: Test
Source reference: KOBT-3795 - https://norgesgruppen.atlassian.net/browse/KOBT-3795
Area: Pick&Collect
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere Pick&Collect-betaling for flere ordretyper og betalingsmåter.

## Preconditions

- Webordre må finnes for privatkunde og bedriftskunde.
- Ordre må dekke hjemlevering og hent i butikk.

## Test Data

- Walley.
- Bankkort.
- Privatkunde og bedriftskunde.

## Steps

1. Opprett/finn relevante webordre med Walley og bankkort.
   Expected: Ordre er tilgjengelige i RS.
2. Plukk ordrene i RS.
   Expected: Ordrene kan plukkes.
3. Gjennomfør betaling i RS.
   Expected: Betaling håndteres korrekt for hver ordretype.
4. Verifiser Pick&Collect-rapporter.
   Expected: Rapportene viser korrekt ordre/betalingsinformasjon.

## Pass Criteria

Testen passerer nar alle ordretyper og betalingsmåter fungerer og rapporteres korrekt.

## Fail Criteria

Testen feiler hvis plukk, betaling eller rapportering feiler.

## Blockers / Risks

- Tidligere betalingsdefects er lukket; ingen åpen blocker sett.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3795 2026-05-07. Ingen execution er utfort ved import.