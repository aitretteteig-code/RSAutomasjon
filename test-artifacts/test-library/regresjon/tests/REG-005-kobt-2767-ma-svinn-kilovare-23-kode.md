# REG-005 MA - Svinn kilovare (23 kode)

Set: Regresjon
Default environment: Test
Source reference: KOBT-2767 - https://norgesgruppen.atlassian.net/browse/KOBT-2767
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Registrere svinn for kilovare med 23-kode i Mobile Access.

## Preconditions

- Tilgang til Mobile Access, hovedpc, BO og svinnrapport.

## Test Data

- 23-strekkode.
- Arsakskode, antall og fritekst.

## Steps

1. Logg inn i Mobile Access og velg svinn.
   Expected: Svinnfunksjonen apnes.
2. Scan en 23-strekkode og registrer arsaks kode, antall og fritekst.
   Expected: Svinnlinje registreres.
3. Send svinn.
   Expected: Svinn sendes uten feil.
4. Sjekk Mobile Access-logg pa hovedpc, svinnrapport pa BO og lagerbevegelser i RS.
   Expected: Logg, rapport og lagerbevegelser viser korrekt svinn.

## Pass Criteria

Testen passerer nar 23-kode-svinn er sendt og verifisert i logg, rapport og lagerbevegelser.

## Fail Criteria

Testen feiler hvis innsending eller en av verifikasjonene mangler/er feil.

## Blockers / Risks

- Krever tilgang til hovedpc/BO og lagerbevegelser i RS.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2767 2026-05-07. Ingen execution er utfort ved import.