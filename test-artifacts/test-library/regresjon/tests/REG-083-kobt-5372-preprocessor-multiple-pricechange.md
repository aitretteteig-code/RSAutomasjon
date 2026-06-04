# REG-083 Preprocessor_multiple_Pricechange

Set: Regresjon
Default environment: Test
Source reference: KOBT-5372 - https://norgesgruppen.atlassian.net/browse/KOBT-5372
Area: Integrasjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at flere prisendringer på samme artikkel fra SAP gir korrekt sannhet i RS/preprocessor.

## Preconditions

- Preprocessor og RS-synk tilgjengelig.

## Test Data

- Artikkel sendt flere ganger med pris opp og ned.

## Steps

1. Send flere prisendringer for samme artikkel fra SAP.
   Expected: Prisendringer prosesseres.
2. Verifiser preprocessor og RS.
   Expected: Siste korrekte sannhet ligger i RS og preprocessor er i synk.

## Pass Criteria

Testen passerer nar riktig siste prisverdi er synkron i RS/preprocessor.

## Fail Criteria

Testen feiler hvis gammel/feil pris vinner eller systemene er ute av synk.

## Blockers / Risks

- Mangler detaljerte Jira-steg/testdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-5372 2026-05-07. Ingen execution er utfort ved import.