# REG-092 Test av feil OA hentes ved editering av kampanjer

Set: Regresjon
Default environment: Test
Source reference: KOBT-6098 - https://norgesgruppen.atlassian.net/browse/KOBT-6098
Area: Kampanje
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at feil OA ikke hentes ved editering/reopening av kampanjer.

## Preconditions

- Kampanjemodul tilgjengelig.
- Kampanje med overstyrt OA finnes eller kan opprettes.

## Test Data

- Kampanjevare med OA som avviker fra default OA.

## Steps

1. Opprett kampanje med overstyrt OA.
   Expected: Kampanjen lagres med valgt OA.
2. Åpne kampanjen på nytt.
   Expected: Lagret OA beholdes.
3. Endre og lagre kampanjen igjen.
   Expected: Ingen duplikatlinje opprettes og feil OA hentes ikke.

## Pass Criteria

Testen passerer nar lagret OA beholdes ved reopening/editering uten duplikatlinjer.

## Fail Criteria

Testen feiler hvis default/feil OA hentes eller duplikatlinje opprettes.

## Blockers / Risks

- KOBT-testen peker til BUT-4473 for grunnlag; BUT-4473 er Deployed, ingen aktiv blocker funnet.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-6098 2026-05-07. Ingen execution er utfort ved import.