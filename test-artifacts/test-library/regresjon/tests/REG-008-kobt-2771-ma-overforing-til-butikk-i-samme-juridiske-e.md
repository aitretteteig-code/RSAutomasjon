# REG-008 MA - Overføring til butikk i samme juridiske enhet

Set: Regresjon
Default environment: Test
Source reference: KOBT-2771 - https://norgesgruppen.atlassian.net/browse/KOBT-2771
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Overfore varer til butikk i samme juridiske enhet via Mobile Access.

## Preconditions

- Tilgang til Mobile Access, hovedpc og BO.
- Mottakerbutikk i samme juridiske enhet.

## Test Data

- 21-koder, 23-kode, datamatrix og databar.
- Arsakskode, butikk og antall.

## Steps

1. Logg inn i Mobile Access og velg overforing.
   Expected: Overforingsfunksjonen apnes.
2. Scan varer, velg arsaks kode og butikk i samme juridiske enhet, og angi antall.
   Expected: Overforingslinjer er klare til sending.
3. Send overforing fra Mobile Access.
   Expected: Overforing sendes uten feil.
4. Verifiser fil pa hovedpc og overforing pa BO.
   Expected: Fil er mottatt og overforing vises pa BO.

## Pass Criteria

Testen passerer nar overforing sendes og vises korrekt hos mottak/system.

## Fail Criteria

Testen feiler hvis overforing ikke sendes eller ikke kan verifiseres pa hovedpc/BO.

## Blockers / Risks

- Krever butikk i samme juridiske enhet og tilgang til BO/hovedpc.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2771 2026-05-07. Ingen execution er utfort ved import.