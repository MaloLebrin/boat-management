# 2026-06-16 — Correctifs code review : Quota de stockage (#72)

**Backend**

- `app/services/quota_service.ts` — Correctif : le décrément de `storage_used_bytes` est désormais plafonné à la valeur courante (`Math.min`) pour éviter un passage en négatif en cas d'incohérence de données. Commentaire ajouté sur la fenêtre de concurrence des notifications de seuil (déduplication assurée par `correlationSuffix` dans `EmailQueueService`). Ligne vide manquante après le constructeur.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Ko/Mo/Go remplacés par des clés i18n (`settings.billing.usage.kb/mb/gb`) afin d'afficher KB/MB/GB en anglais.
- `resources/lang/fr/settings.json` — Ajout des clés `kb`, `mb`, `gb` (Ko/Mo/Go).
- `resources/lang/en/settings.json` — Ajout des clés `kb`, `mb`, `gb` (KB/MB/GB).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Test HTTP creux remplacé par des assertions Inertia réelles (`assertInertiaComponent` + `assertInertiaPropsContain`). Test dupliqué de décrément remplacé par un test couvrant le plancher à zéro (décrément supérieur à la valeur courante).

**Docs**

- `docs/changelog.md` — Correction des accents manquants sur les entrées du 2026-06-16.

---
