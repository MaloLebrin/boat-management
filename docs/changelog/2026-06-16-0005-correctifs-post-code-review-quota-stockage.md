# 2026-06-16 — Correctifs post-code-review quota stockage

**Backend**

- `app/services/media_service.ts` — `deleteAllForEntity` accepte désormais `org?: Organization` : somme les bytes des médias avant suppression groupée et appelle `updateStorageUsed(org, -totalBytes)` après (corrigeait une dérive silencieuse du compteur lors de la suppression d'un bateau/moteur/pièce).
- `app/services/media_service.ts` — `logger.warn` si `org` est absent pour un `entityType !== 'user'` (détection en dev des oublis de passage d'organisation).
- `app/services/media_service.ts` — Commentaire explicitant la différence `file.size` (guard pre-upload) vs `uploaded.bytes` (compteur post-Cloudinary, après compression PDF éventuelle).
- `app/services/quota_service.ts` — Commentaire race condition sur `assertCanUpload` (symétrique avec le commentaire existant dans `updateStorageUsed`).
- `app/services/quota_service.ts` — Commentaire side effect `org.refresh()` dans `updateStorageUsed`.

**Email**

- `resources/views/emails/storage_quota_warning.edge` — Correction des accents manquants (`libéré`, `mis à jour`, `Gérer`).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Suppression du test en doublon (`storage usage decrements correctly on deletion`, identique à `updateStorageUsed decrements storage_used_bytes on deletion`).

---
