# HC-016 Varetelling

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3584 - https://norgesgruppen.atlassian.net/browse/KOBT-3584
Area: Lager / Varetelling
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere mottak av beholdningsfil og at varetelling kan gjennomfores via Mobile Access, POS og RS Store.

## Preconditions

- Beholdningsfil fra NG Flyt må avtales med ressurs hos NG Flyt.
- Pre-condition KOBT-4050 må være oppfylt.
- Tilgang til RS Connector, RS Store, Mobile Access og POS i varetellingsmodus.

## Test Data

- Artikkel for telling: Avklares ved execution.

## Environment Paths

RS Test:

- `\\ngvrspreproc01u\d$\RSConnector-Data\RsConnectorStockToVismaRS\Stock`

RS Stage:

- `\\NGVRSPREPRST01P\d$\RSConnector-Data\RsConnectorStockToVismaRS\Stock`

## Steps

1. Motta beholdningsfil fra NG Flyt.
   Expected: Beholdningsfil er levert.
2. Verifiser mottak til RS Connector.
   Expected: Fil finnes i riktig Stock-path for valgt miljo. Sjekk at dato på fil er dagens dato
3. Verifiser at fil er lest inn i RS Store.
   Expected: Beholdning er tilgjengelig i RS Store.
4. Logg på Mobile Access og gjør en varetelling for én artikkel.
   Expected: Telling lagres.
5. Logg på POS i varetellingsmodus og gjør en telling for én artikkel.
   Expected: POS-telling lagres.
6. I RS Store, gjør en manuell telling av én artikkel.
   Expected: Manuell telling lagres.
7. I RS Store, gjør en korrigering av varetellingslinjer.
   Expected: Korrigering lagres.

## Pass Criteria

Testen passerer nar beholdningsfilen er innlest og telling/korrigering fungerer i Mobile Access, POS og RS Store.

## Fail Criteria

Testen feiler hvis fil ikke leses inn eller en tellekanal ikke fungerer.

## Blockers / Risks

- Krever NG Flyt-leveranse og POS i varetellingsmodus.

## Notes

Ingen execution er utfort ved import.
