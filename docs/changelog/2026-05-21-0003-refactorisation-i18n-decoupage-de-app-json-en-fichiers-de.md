# 2026-05-21 — Refactorisation i18n : découpage de `app.json` en fichiers de domaine

- Suppression de `resources/lang/{en,fr}/app.json` (1 080+ lignes)
- Création de 13 fichiers de domaine par locale : `common.json`, `nav.json`, `auth.json`, `dashboard.json`, `planning.json`, `maintenance.json`, `settings.json`, `errors.json`, `equipment.json`, `boats.json`, `homePreview.json`, `public.json`, `ports.json`
- `app/middleware/inertia_middleware.ts` : filtre désormais par exclusion des namespaces backend-only (`flash`, `marketing`, `validator`) au lieu d'un filtre `app.*`
- API frontend `useT().t('clé')` inchangée — toutes les clés existantes fonctionnent sans modification

---
