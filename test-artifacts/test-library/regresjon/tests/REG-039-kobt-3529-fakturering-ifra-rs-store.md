# REG-039 Fakturering ifra RS Store

Set: Regresjon
Default environment: Test
Source reference: KOBT-3529 - https://norgesgruppen.atlassian.net/browse/KOBT-3529
Area: Faktura
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Fakturere kontokundesalg fra RS Store og validere fakturakopi/regnskapsfiler.

## Preconditions

- Kontokunder for papir, e-post og EHF finnes.
- POS og RS Connector tilgjengelig.

## Test Data

- Kundenummer for papir, e-post og EHF.
- POS-bonger for kontokunder.

## Steps

1. Finn og noter kundenummer for relevante kontokunder.
   Expected: Testkundene er klare.
2. Slå inn bonger i POS på kontokundene.
   Expected: Bongene er registrert.
3. Fakturer bongene i RS.
   Expected: Fakturaer opprettes.
4. Last ned fakturakopi og verifiser innhold.
   Expected: Fakturaer har riktig informasjon for papir, e-post og EHF.
5. Verifiser filer i RS Connector.
   Expected: Regnskapsfiler er lagt ut og har riktig innhold.

## Pass Criteria

Testen passerer nar alle fakturatyper gir korrekt faktura og regnskapsfil.

## Fail Criteria

Testen feiler hvis bong/faktura/fil mangler eller innhold er feil.

## Blockers / Risks

- Defect BUT-4376 er resolved, men relevant for PDF/leveranseverifisering.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3529 2026-05-07. Ingen execution er utfort ved import.