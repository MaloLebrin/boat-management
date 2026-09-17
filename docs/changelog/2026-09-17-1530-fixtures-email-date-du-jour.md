# Fixtures d'e-mails : la date du jour ne fige plus la suite

**Date** : 2026-09-17 — correctif de test (hors plan de refactorisation).

## Problème

`tests/integration/services/email_queue_payloads.spec.ts` (photographie des
charges utiles d'`EmailQueueService`, vague 2.2) neutralisait dans les clés de
déduplication les horodatages à 13 chiffres (`:<ts>`) et les mois
(`:<yyyy-MM>`), mais **pas une date ISO complète** : l'expression
`/:(\d{4})-(\d{2})(?=["\\])/` exige un guillemet juste après le mois, ce que
`-JJ` empêche.

Or `sendReminderDocumentExpiry` construit son `correlationId` avec
`DateTime.now().toISODate()`. Les deux fixtures `reminderDocumentExpiry*`
enregistrées le 2026-09-16 portaient donc cette date en dur, et la suite
`unit-integration` échouait sur ces deux tests à partir du 2026-09-17 —
sur `main` comme sur toute branche ouverte, sans lien avec le contenu des PR.

## Changement

- `normalize()` neutralise la date ISO complète (`:<yyyy-MM-dd>`) **avant** la
  règle du mois, sinon la première consomme l'année-mois et laisse le jour.
- Les deux fixtures `reminderDocumentExpiry30.json` et
  `reminderDocumentExpiry7.json` sont régénérées
  (`UPDATE_EMAIL_FIXTURES=1`) : seules les trois occurrences de la date
  changent (clé, `correlationId`, `dedupKey`). Les dates d'expiration
  affichées dans le corps HTML (`2026-08-01`, `2026-07-08`) ne sont pas
  touchées — elles ne sont pas précédées d'un `:` de segment de clé.

## Tests

- Échec reproduit localement à l'identique avant correctif (2 échecs sur 27),
  puis suite `unit integration` complète verte : 916 tests.
