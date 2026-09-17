# EmailQueueService : une seule file d'envoi pour les notifications

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 2.2.

## Problème

Chacun des dix-sept envois `SendEmail` de `app/services/email_queue_service.ts`
(bienvenue, réinitialisation, invitation, rappels, alertes de quota,
notifications de plan et de module, contact) répétait la même queue de vingt
lignes : payload partiel, clé de déduplication, payload complet,
`QueueDedupService.enqueueUnique` avec le job, la file `emails` et le
dispatch. 816 lignes, dont 238 de copie.

## Changement — contenu des e-mails inchangé

- Un privé `#enqueue(partialPayload)` porte la séquence une fois : clé
  dérivée du payload (`correlationId`, sinon empreinte sujet + texte), file
  `emails`, dispatch de `SendEmail`. Les dix-sept envois se réduisent à leur
  contenu (sujet, texte, gabarit Edge) suivi de `await this.#enqueue({…})`.
- Les envois qui ont leur propre job (`sendInvoice`, `sendRentalContract`)
  gardent leur clé horodatée et leur appel direct à `dedup`.
- Sujets, textes, gabarits, clés de corrélation, noms de jobs et files sont
  strictement identiques (fixtures ci-dessous). Le fichier passe de 816 à
  617 lignes.
- Reporté : la mise des sujets et corps bilingues concaténés en clés i18n
  (`emails.json`) change le contenu envoyé et suppose de connaître la locale
  du destinataire pour chaque envoi ; ce sera une PR à part, appuyée sur ces
  mêmes fixtures (mises à jour volontairement).

## Tests

- **Caractérisation avant** :
  `tests/integration/services/email_queue_payloads.spec.ts` — vingt-sept
  scénarios à entrées fixes (chaque `sendX`, avec et sans nom, avec et sans
  branding, seuils 80 % / 100 %, échéances 30 / 7 jours, locales fr / en)
  figent `{ key, jobName, queue, payload }` transmis à
  `QueueDedupService.enqueueUnique` dans
  `tests/integration/services/__fixtures__/email_queue/*.json`. Horodatages
  des clés « à la demande » et port aléatoire d'`APP_URL` neutralisés ;
  déterminisme vérifié sur deux exécutions. Le refactor produit un diff nul.
  Régénération volontaire : `UPDATE_EMAIL_FIXTURES=1`.
- Suites existantes qui déclenchent des envois (`billing/*`, `auth/*`,
  `contact`, rappels) inchangées ; `pnpm lint`, `tsc -b`, `node ace build`,
  suite backend complète.
