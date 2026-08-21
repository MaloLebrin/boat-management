# 2026-06-16 — Feature : Quota de stockage (#72)

**Backend**

- `shared/types/plan.ts` — Ajout de `storageGb: number | null` dans `PlanQuotas` (1 Go Starter, 20 Go Pro, null Enterprise). Ajout de `storage: { usedBytes: number; limitBytes: number | null }` dans `QuotaUsage`.
- Migration `1791000000000_add_storage_to_organizations.ts` — Colonne `storage_used_bytes` (bigint, default 0) sur la table `organizations`.
- `database/schema.ts` — Ajout du champ `storageUsedBytes` dans `OrganizationSchema`.
- `app/exceptions/quota_errors.ts` — Ajout de `'storage'` dans le type `QuotaFeature`.
- `app/services/quota_service.ts` — Nouvelles méthodes `storageLimitBytes()`, `assertCanUpload()`, `updateStorageUsed()`. Détection des seuils 80%/100% pour envoi d'email de notification aux admins.
- `app/services/media_service.ts` — Modification de `upload()` et `deleteById()` pour accepter un paramètre `org` optionnel. Vérification du quota avant upload et mise à jour du compteur après upload/suppression.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendStorageQuotaWarning()` pour notifier les admins.
- `app/controllers/boat_media_controller.ts` — Passage de l'organisation a `upload()` et `deleteById()` pour le tracking du stockage.
- `app/controllers/boat_engine_parts_controller.ts` — Idem pour les documents de pieces moteur.
- `app/controllers/settings_controller.ts` — Ajout de `storage` dans `quotaUsage` pour la page billing.
- `resources/views/emails/storage_quota_warning.edge` — Template email bilingue pour les alertes de quota.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Nouveau composant generique pour les jauges d'usage (boats, members, storage).
- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Utilisation du nouveau composant jauge et ajout de la jauge stockage avec formatage bytes (Ko/Mo/Go).

**i18n** — Cle `settings.billing.usage.storage` ajoutee (FR + EN).

**Tests** — `tests/functional/quota/storage.spec.ts` pour les tests du quota de stockage.

---
