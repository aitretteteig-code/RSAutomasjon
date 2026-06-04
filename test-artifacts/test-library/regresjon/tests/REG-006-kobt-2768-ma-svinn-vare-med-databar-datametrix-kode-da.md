# REG-006 MA - Svinn vare med databar / datametrix kode (dato i strekkoden)

Set: Regresjon
Default environment: Test
Source reference: KOBT-2768 - https://norgesgruppen.atlassian.net/browse/KOBT-2768
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Registrere svinn for vare med databar/datamatrix-kode der dato ligger i strekkoden.

## Preconditions

- Tilgang til Mobile Access, hovedpc, BO og svinnrapport.

## Test Data

- Databar-kode.
- Datamatrix-kode.
- Arsakskode, antall og fritekst.

## Steps

1. Logg inn i Mobile Access og velg svinn.
   Expected: Svinnfunksjonen apnes.
2. Scan databar-kode og registrer arsaks kode, antall og fritekst.
   Expected: Svinnlinje registreres.
3. Scan datamatrix-kode og registrer arsaks kode, antall og fritekst.
   Expected: Svinnlinje registreres.
4. Send svinn.
   Expected: Svinn sendes uten feil.
5. Sjekk Mobile Access-logg pa hovedpc, svinnrapport pa BO og lagerbevegelser i RS.
   Expected: Logg, rapport og lagerbevegelser viser korrekt svinn.

## Pass Criteria

Testen passerer nar begge kodetypene gir korrekt svinnregistrering og verifisering.

## Fail Criteria

Testen feiler hvis kode leses feil, svinn ikke sendes, eller verifikasjon mangler.

## Blockers / Risks

- Krever scannbare databar/datamatrix-testvarer.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2768 2026-05-07. Ingen execution er utfort ved import.