# REG-072 Legge til/ fjerne rolle som butikksjef i RS

Set: Regresjon
Default environment: Test
Source reference: KOBT-4156 - https://norgesgruppen.atlassian.net/browse/KOBT-4156
Area: Tilgang
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Legge til og fjerne rolle som butikksjef i RS.

## Preconditions

- Meny Jessheim testmiljø.
- Bruker med butikksjefrettigheter via godkjent vault.

## Test Data

- Bruker/rolledata.

## Steps

1. Legg til butikksjefrolle på bruker i RS.
   Expected: Rollen legges til.
2. Verifiser rolle/tilgang i RS.
   Expected: Bruker har forventede butikksjefrettigheter.
3. Fjern butikksjefrollen.
   Expected: Rollen fjernes og tilgang oppdateres.

## Pass Criteria

Testen passerer nar rollen kan legges til og fjernes med korrekt effekt.

## Fail Criteria

Testen feiler hvis rolleendring ikke lagres eller tilgang ikke oppdateres.

## Blockers / Risks

- Jira har begrensede steg.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4156 2026-05-07. Ingen execution er utfort ved import.