# REG-067 Test av rapport 1172 (Tidsforbruk) BLOKKERT

Set: Regresjon
Default environment: Test
Source reference: KOBT-4099 - https://norgesgruppen.atlassian.net/browse/KOBT-4099
Area: Rapport
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere rapport 1172 Tidsforbruk for aktiv plukktid.

## Preconditions

- Precondition KOBT-4100: opprett 4 webshop-ordre i PREPROD Meny.no.
- Sensitive credential-detaljer hentes fra godkjent vault og dokumenteres ikke.

## Test Data

- Ordre med aktiv plukk og pauseplukk/status 45.

## Steps

1. Start plukk på ordre og sett en ordre i pauseplukk/status 45.
   Expected: Ordren er pauset.
2. Gjenoppta plukk slik at status blir aktiv igjen.
   Expected: Ordren går tilbake til aktiv plukk.
3. Åpne rapport 1172.
   Expected: Rapporten teller kun aktiv plukktid og stopper i status 45.

## Pass Criteria

Testen passerer nar rapport 1172 måler aktiv plukktid korrekt.

## Fail Criteria

Testen feiler hvis pausetid telles som aktiv plukktid eller rapporten ikke viser korrekt tid.

## Blockers / Risks

- Summary sier BLOKKERT.
- Krever precondition og egnet plukkdata.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-4099 2026-05-07. Ingen execution er utfort ved import.