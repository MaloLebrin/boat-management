# 2026-07-09 — [#332] Offre modulaire 5a : notifications de résiliation de module

Premier lot du cycle de vie (#332). Quand un module add-on souscrit disparaît de l'abonnement (résiliation, downgrade, annulation), les admins de l'organisation sont notifiés.

- **Event** `OrganizationModuleDeactivated` (`app/events/`, sur le modèle de `OrganizationPlanDowngraded`), dispatché **après commit** par `SubscriptionService` pour chaque module retiré. `OrganizationModuleService.reconcileSubscriptionModules` renvoie désormais `{ removed: PlanModule[] }`.
- **Listener** `on_organization_module_deactivated` : notification in-app (`module.deactivated`) + email transactionnel (dédupliqué) à chaque admin. Enregistré dans `start/events.ts`.
- **Email** : template `resources/views/emails/module_deactivated.edge` + `EmailQueueService.sendModuleDeactivatedNotification`.
- **i18n** : `notifications.messages.module.{names,deactivated}` (en + fr) ; type `module.deactivated` ajouté à `NotificationType`.
- **Tests** : event dispatché quand un module est retiré (pas sinon) ; listener notifie chaque admin (pas les membres) et enqueue l'email avec le bon module.
