# 2026-06-30 — [#157] Sécurité IDOR : syncCrewForNavigationLog scopé par organisation

**Bug de sécurité corrigé**

- `app/services/crew_service.ts` — `syncCrewForNavigationLog` construisait le `pivotData` directement depuis `payload.crew` sans vérifier que les IDs de membres appartiennent à l'organisation du log. Un utilisateur de l'org A pouvait injecter des IDs de membres de l'org B via un PATCH sur `/boats/:id/navigation-logs/:logId/crew`.
- **Correctif** : requête préalable `CrewMember.query().whereIn('id', ids).where('organizationId', log.organizationId)` — seuls les IDs validés dans la bonne org sont inclus dans le `sync`.
- Route concernée : `PATCH /boats/:boatId/navigation-logs/:logId/crew`
