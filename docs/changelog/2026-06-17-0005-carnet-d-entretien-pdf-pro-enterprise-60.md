# 2026-06-17 — Carnet d'entretien PDF — Pro & Enterprise #60

**Backend**

- `app/services/maintenance_log_pdf_service.ts` — génération PDF (PDFKit) : en-tête bateau, spécifications, historique chronologique des interventions avec pièces.
- `app/controllers/maintenance_log_pdf_controller.ts` — route `GET /boats/:id/maintenance-log.pdf`, vérifie `assertCanExport` (403→redirect pour plan Starter).
- `app/services/quota_service.ts` — ajout méthode `canExport(org): boolean` (lecture seule, sans lever d'exception).
- `start/routes/boats.ts` — route `boats.maintenanceLog.download`.
- `app/transformers/boat_transformer.ts` — prop `canExport` ajoutée dans `toShowProps` / `BoatShowContext`.

**Frontend**

- `inertia/pages/boats/show.vue` — prop `canExport`, bouton "Télécharger le carnet PDF" visible pour les orgs Pro/Enterprise.
- `inertia/types/boat_show.ts` — type `MaintenanceLogPdfProps`.
- `resources/lang/fr/boats.json` + `resources/lang/en/boats.json` — clés `boats.maintenanceLog.*`.

---
