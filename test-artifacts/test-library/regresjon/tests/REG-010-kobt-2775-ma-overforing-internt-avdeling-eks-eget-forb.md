# REG-010 MA - Overføring internt (Avdeling eks eget forbruk)

Set: Regresjon
Default environment: Test
Source reference: KOBT-2775 - https://norgesgruppen.atlassian.net/browse/KOBT-2775
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Gjennomfore intern overforing mellom avdelinger via Mobile Access.

## Preconditions

- Tilgang til Mobile Access, hovedpc og BO.
- Mottakeravdeling tilgjengelig.

## Test Data

- 20/21/23-koder, datamatrix og databar.
- Arsakskode, avdeling og antall.

## Steps

1. Logg inn i Mobile Access og velg overforing.
   Expected: Overforingsfunksjonen apnes.
2. Scan varer, velg arsaks kode og avdeling, og angi antall.
   Expected: Interne overforingslinjer er klare til sending.
3. Send overforing fra Mobile Access.
   Expected: Overforing sendes uten feil.
4. Verifiser fil pa hovedpc og overforing pa BO.
   Expected: Fil er mottatt og overforing vises pa BO.

## Pass Criteria

Testen passerer nar intern overforing sendes og verifiseres korrekt.

## Fail Criteria

Testen feiler hvis overforing ikke sendes eller ikke vises i etterkontroll.

## Blockers / Risks

- Krever relevante avdelinger og tilgang til BO/hovedpc.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2775 2026-05-07. Ingen execution er utfort ved import.