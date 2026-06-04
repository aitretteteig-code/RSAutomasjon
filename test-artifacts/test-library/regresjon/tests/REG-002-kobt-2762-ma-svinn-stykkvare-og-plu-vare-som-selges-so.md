# REG-002 MA - Svinn stykkvare og PLU vare som selges som stykk vare

Set: Regresjon
Default environment: Test
Source reference: KOBT-2762 - https://norgesgruppen.atlassian.net/browse/KOBT-2762
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Registrere svinn for stykkvare og PLU-vare i Mobile Access og verifisere fil/rapport.

## Preconditions

- Tilgang til Mobile Access.
- Tilgang til BO/bakromspc og svinnrapport.

## Test Data

- GTIN pa stykkvare.
- PLU pa stykkvare.
- Arsakskode og antall.

## Steps

1. Logg inn i Mobile Access og velg svinn.
   Expected: Svinnfunksjonen apnes.
2. Scan GTIN pa stykkvare og registrer arsaks kode og antall.
   Expected: Svinnlinje registreres.
3. Scan PLU pa stykkvare og registrer arsaks kode og antall.
   Expected: Svinnlinje registreres.
4. Send svinn.
   Expected: Svinn sendes uten feil.
5. Verifiser fil pa BO og svinnrapport.
   Expected: Fil er lagt ut til BO og svinn vises i svinnrapport.

## Pass Criteria

Testen passerer nar begge varetypene gir korrekt svinnfil og vises i rapport.

## Fail Criteria

Testen feiler hvis registrering, sending, fil eller rapport mangler/er feil.

## Blockers / Risks

- Krever Mobile Access og BO-tilgang.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2762 2026-05-07. Ingen execution er utfort ved import.