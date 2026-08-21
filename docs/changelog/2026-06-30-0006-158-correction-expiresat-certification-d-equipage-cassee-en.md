# 2026-06-30 — [#158] Correction : expiresAt certification d'équipage cassée en PostgreSQL

**Bug critique corrigé**

- `app/controllers/crew_certifications_controller.ts` — `String(payload.expiresAt)` sur un objet `Date` produit un format non-ISO (`Mon Jan 15...`) rejeté par PostgreSQL. Remplacé par `payload.expiresAt ?? null` (valeur brute passée au service).
- `app/services/crew_service.ts` — le cast `as unknown as any` masquait le type mismatch. Remplacé par `toDateTime(payload.expiresAt)` (helper `shared/helpers/date.ts`) qui convertit `Date | string | DateTime` en Luxon `DateTime` avant persistance via `@column.date()`.
- `shared/types/crew.ts` — `CreateCrewCertificationPayload.expiresAt` typé `Date | string | DateTime | null` (cohérent avec les autres payloads du projet).
- 4 tests fonctionnels ajoutés dans `tests/functional/crew/crew_certifications.spec.ts` (création avec date, sans date, IDOR, suppression).
- Routes concernées : `POST /crew/:memberId/certifications`, `DELETE /crew/:memberId/certifications/:certId`
