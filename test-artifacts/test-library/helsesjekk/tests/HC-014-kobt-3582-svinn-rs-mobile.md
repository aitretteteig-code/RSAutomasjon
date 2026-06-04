# HC-014 Svinn RS Store og Mobile Access

Set: Helsesjekk
Default environment: Test
Source reference: KOBT-3582 - https://norgesgruppen.atlassian.net/browse/KOBT-3582
Area: Lager / Svinn
Priority: Normal
Status: NOT RUN
Documentation status: Ready, based on Jira description

## Objective

Verifisere at svinntransaksjoner fra RS Store og Mobile Access blir synlige under lagerjusteringer.

## Preconditions

- Tilgang til RS Store.
- Tilgang til Mobile Access.
- Egnet testvare finnes.

## Test Data

- Vare: Avklares ved execution.
- Svinnmengde: Avklares ved execution.

## Steps

1. I RS Store, gjør en svinntransaksjon for en vare.
   Expected: Svinntransaksjonen lagres.
2. I Mobile Access, gjør en svinntransaksjon for en vare.
   Expected: Svinntransaksjonen lagres.
3. Verifiser at begge kilder er synlige under lagerjusteringer i RS.
   Expected: Både RS Store og Mobile Access vises som kilder.

## Pass Criteria

Testen passerer nar begge svinnkilder vises i lagerjusteringer.

## Fail Criteria

Testen feiler hvis svinn ikke registreres eller ikke vises i lagerjusteringer.

## Blockers / Risks

- Krever Mobile Access.

## Notes

Ingen execution er utfort ved import.
