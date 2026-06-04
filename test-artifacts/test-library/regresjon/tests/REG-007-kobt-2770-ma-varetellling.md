# REG-007 MA-Varetellling

Set: Regresjon
Default environment: Test
Source reference: KOBT-2770 - https://norgesgruppen.atlassian.net/browse/KOBT-2770
Area: Mobile Access
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Gjennomfore varetelling i Mobile Access med flere kodetyper og verifisere sekvens.

## Preconditions

- Tilgang til Mobile Access og BO.

## Test Data

- GTIN.
- Antall over 25.
- Stk 20-koder.
- 20/21/23-koder.
- Databar og datamatrix.

## Steps

1. Logg inn i Mobile Access og velg varetelling.
   Expected: Varetelling apnes.
2. Scan GTIN, velg antall og angi navn pa sekvens.
   Expected: Sekvens opprettes.
3. Scan GTIN med antall over 25, stk 20-koder, 20/21/23-koder, databar og datamatrix.
   Expected: Alle kodetyper registreres i tellingen.
4. Send telling.
   Expected: Telling sendes uten feil.
5. Verifiser fil pa BO og at sekvens vises i apen telling.
   Expected: Fil er mottatt og sekvens er synlig.

## Pass Criteria

Testen passerer nar alle kodetyper registreres, fil mottas og sekvens vises i apen telling.

## Fail Criteria

Testen feiler hvis telling ikke sendes, fil mangler, eller sekvens ikke vises.

## Blockers / Risks

- Krever relevante strekkoder og BO-tilgang.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-2770 2026-05-07. Ingen execution er utfort ved import.