# REG-053 Mulighet for å kopiere en produksjon i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-3611 - https://norgesgruppen.atlassian.net/browse/KOBT-3611
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere kopiering av produksjon i RS.

## Preconditions

- Eksisterende produksjon/batch for butikk/produksjonsvare.

## Test Data

- Produksjonsvare med tidligere batch.
- Scenario med utløpt batch eller dato.

## Steps

1. Start ny produksjon og velg mellom fra scratch eller kopi av siste batch.
   Expected: Begge valg er tilgjengelige.
2. Kopier tidligere produksjon.
   Expected: Informasjon kopieres og ingredienser er ferdig plukket i steg 2.
3. Juster ingredienser, mengde og datoer.
   Expected: Endringer kan gjøres og kalkyler skjer normalt.
4. Test utløpt batch/dato.
   Expected: Advarsel vises og prosessen kan ikke fortsette før retting.

## Pass Criteria

Testen passerer nar produksjonskopi, justeringer, kalkyler og validering fungerer.

## Fail Criteria

Testen feiler hvis kopi mangler data, validering ikke virker eller produksjon stopper feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3611 2026-05-07. Ingen execution er utfort ved import.