# REG-058 Bestillingsalternativ skal vise innpris i oversikten i RS.

Set: Regresjon
Default environment: Test
Source reference: KOBT-3633 - https://norgesgruppen.atlassian.net/browse/KOBT-3633
Area: Vare
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at bestillingsalternativ viser innpris i RS.

## Preconditions

- Tilgang til RS og vare med bestillingsalternativer.

## Test Data

- Vare med ett eller flere OA.

## Steps

1. Åpne oversikt over bestillingsalternativer for varen.
   Expected: Alle synlige bestillingsalternativer viser innpris.
2. Rediger eller endre et bestillingsalternativ.
   Expected: Innpris vises også ved redigering.

## Pass Criteria

Testen passerer nar innpris vises i både oversikt og redigering.

## Fail Criteria

Testen feiler hvis innpris mangler eller vises feil.

## Blockers / Risks

- Ingen tydelige åpne blokkere.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3633 2026-05-07. Ingen execution er utfort ved import.