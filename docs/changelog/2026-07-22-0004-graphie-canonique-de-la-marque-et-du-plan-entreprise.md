# 2026-07-22 — Graphie canonique de la marque et du plan Entreprise (#411)

Audit UX du 2026-07-19 : trois graphies de la marque coexistaient (« FleetAi », « FleetAI », « Fleet AI »), parfois sur la même page, plus l'ancienne marque « FleetView » en défaut des PDFs. Le nom du plan mélangeait « Enterprise » (marketing) et « Entreprise » (app).

- **Marque unifiée sur `FleetAi`** partout : i18n (`marketing.json`, `settings.json` EN + FR), composants et pages Vue (mocks home, `design_system`, `home` JSON-LD, `AuthNavyPanel`), layout SEO/JSON-LD (`inertia_layout.edge`), suffixe de titre global (`inertia/app.ts`), en-têtes des PDFs maintenance (`maintenance_log_pdf_service`, `maintenance_history_pdf_service`, ancien « FleetView »), placeholder white-label et `README`.
- **Plan « Entreprise » (FR)** : chaînes d'affichage FR normalisées (`marketing.json`, `flash.json`) ; l'anglais reste `Enterprise`. Les noms de clés i18n et identifiants de code (`enterprise`, `ModulesRequireEnterprisePlanError`, `header_enterprise`…) sont inchangés.
- **Convention documentée** dans `CLAUDE.md` (section Branding) : `FleetAi` unique, plan `Entreprise` en FR / `Enterprise` en EN.
