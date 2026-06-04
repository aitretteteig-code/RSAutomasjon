# HC-019 Okta palogg RS Stage

Set: Helsesjekk
Default environment: Stage
Source reference: KOBT-6183 - https://norgesgruppen.atlassian.net/browse/KOBT-6183
Area: Innlogging / Stage
Priority: Needs detail
Status: NOT RUN
Documentation status: Needs detail - Jira description is empty

## Objective

Verifisere Okta-pålogging til RetailSuite i Stage.

## Preconditions

- Stage-miljo skal brukes for denne testen.
- Testbruker med riktig Okta-tilgang må være tilgjengelig.
- Ikke lagre passord, tokens eller sessiondata i testartefakter.

## Test Data

- Miljo: Stage.
- Bruker: Avklares ved execution.
- URL: Avklares ved execution.

## Steps

1. Åpne RetailSuite Stage.
   Expected: Innloggingsflyt starter.
2. Velg Okta-pålogging hvis valg vises.
   Expected: Bruker sendes til Okta eller Okta-flyt vises.
3. Logg inn med godkjent Stage-testbruker.
   Expected: Innlogging fullføres uten feil.
4. Verifiser at bruker lander i RetailSuite.
   Expected: RetailSuite er tilgjengelig etter innlogging.
5. Verifiser at bruker har forventet tilgang.
   Expected: Relevante menyer/funksjoner er synlige.

## Pass Criteria

Testen passerer nar Okta-pålogging til RS Stage fungerer og bruker får forventet tilgang.

## Fail Criteria

Testen feiler hvis innlogging stopper, redirect feiler, eller bruker mangler forventet tilgang.

## Blockers / Risks

- Jira har ingen beskrivelse utover tittel.
- Testbruker, URL og forventet tilgang må avklares.

## Notes

Ingen execution er utfort ved import.
