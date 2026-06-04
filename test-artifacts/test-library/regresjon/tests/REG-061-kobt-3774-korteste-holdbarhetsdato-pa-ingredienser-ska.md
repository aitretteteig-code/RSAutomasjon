# REG-061 Korteste holdbarhetsdato på ingredienser skal overstyre maks holdbarhetsdato fra varekort

Set: Regresjon
Default environment: Test
Source reference: KOBT-3774 - https://norgesgruppen.atlassian.net/browse/KOBT-3774
Area: Produksjon
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at korteste holdbarhet på ingrediens overstyrer produksjonsvarens maks holdbarhet.

## Preconditions

- Oppskriftsvare/produksjon med ingrediens som har kortere holdbarhet.

## Test Data

- Ingrediens med holdbarhetsdato kortere enn LifeSpanFromTimeOfProduction.

## Steps

1. Produser vare med ingrediens som har kortere holdbarhetsdato enn produksjonsvaren.
   Expected: Produksjonen kan gjennomføres.
2. Verifiser holdbarhetsdato på ferdig vare.
   Expected: Ingrediensens korteste dato styrer holdbarhetsdato.

## Pass Criteria

Testen passerer nar korteste ingrediensholdbarhet overstyrer maks holdbarhet på produksjonsvaren.

## Fail Criteria

Testen feiler hvis produksjonsvarens maks holdbarhet brukes selv om ingrediens har kortere dato.

## Blockers / Risks

- Deler av AC ligger som bilde; tekstlig AC er begrenset.

## Notes

Jira-informasjon hentet og strukturert fra KOBT-3774 2026-05-07. Ingen execution er utfort ved import.