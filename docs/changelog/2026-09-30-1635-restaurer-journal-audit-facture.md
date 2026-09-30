# 2026-09-30 — Journal d'audit facture et constructeurs SubscriptionService

Le commit d'audit sur `main` appelait `#logInvoiceAction` sans la définir, et
les specs de facturation construisaient `SubscriptionService` avec deux
arguments alors que le service en attend trois (`AuditLogService`). Typecheck,
build et toute la suite backend refusaient de démarrer.

- **Correctif.** Méthode privée `#logInvoiceAction` sur `InvoiceService` :
  elle écrit `invoice.*` dans le journal, avec `userId` nul quand l'acteur
  est absent (job, synchro). Les cinq specs passent `new AuditLogService()`.
- **Tests.** Les specs de facturation concernées compilent à nouveau.
