# Plan de revue — Sécurité & Refactoring

Généré le 2026-05-20. Se référer à ce fichier pour suivre l'avancement des corrections issues de la revue de code.

**Légende :** `[ ]` à faire · `[x]` terminé · `[~]` en cours

---

## Sécurité

### High

- [x] **SEC-H1 — Header Injection via filename** `app/controllers/boat_media_controller.ts:204,246`
  - `media.originalFilename` interpolé directement dans `Content-Disposition` sans sanitisation
  - Risque : header splitting via `\r\n` dans le nom de fichier
  - Fix : `encodeURIComponent()` + filtrage des caractères de contrôle, ou syntaxe RFC 5987 (`filename*=UTF-8''...`)

- [x] **SEC-H2 — Login sans validation VineJS** `app/controllers/session_controller.ts:9`
  - `request.all()` brut sans contrainte de longueur ou de format sur email/password
  - Fix : créer un `loginValidator` (`vine.string().email().maxLength(254)` + `vine.string().minLength(1).maxLength(255)`)

- [x] **SEC-H3 — CSP désactivé** `config/shield.ts:8`
  - `csp.enabled: false` en production
  - Fix : activer avec `default-src 'self'`, adapter pour Cloudinary (`img-src`), Vite CDN, etc.

### Medium

- [x] **SEC-M1 — Absence de rate limiting** `start/routes/auth.ts`, `start/routes/ai.ts`
  - Routes concernées : `POST /login`, `POST /forgot-password`, `POST /reset-password`, `POST /ai/chat`, `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions`
  - Fix : intégrer `@adonisjs/limiter` en named middleware sur ces groupes de routes

- [x] **SEC-M2 — AI Chat : `response.json()` sur route Inertia + messages non validés** `app/controllers/ai_controller.ts:14`
  - `response.badRequest({ error })` / `response.accepted(...)` → JSON brut sur route Inertia
  - Tableau `messages` accepté sans validation de structure (rôle, contenu, longueur, nombre)
  - Fix : remplacer par `session.flash()` + `response.redirect().back()` ; ajouter un validator VineJS pour le schéma `{ role: enum, content: string.maxLength(4000) }`

- [x] **SEC-M3 — `cloudinaryPublicId` exposé dans les props Inertia** `app/controllers/boats_controller.ts:200`, `app/controllers/boat_equipment_controller.ts:346`
  - Exposé inutilement dans toutes les props, pas seulement sur les composants de suppression
  - Fix : ne passer `cloudinaryPublicId` que si strictement nécessaire à l'action frontend

- [x] **SEC-M5 — Token de reset en clair + pas de `timingSafeEqual`** `app/services/password_reset_service.ts:24`
  - Token stocké en clair en base, comparaison SQL sujette aux timing attacks
  - Fix : stocker un hash SHA-256, comparer avec `crypto.timingSafeEqual`

### Low

- [ ] **SEC-L1 — Cookie `locale` avec `httpOnly: false` non documenté** `start/routes/settings.ts:20`
  - Fix : ajouter un commentaire expliquant que ce cookie doit être lisible côté JS pour le switcher de langue

- [ ] **SEC-L2 — `fullName` sans `maxLength`** `app/validators/user.ts:6`
  - Fix : ajouter `.maxLength(255)` sur `vine.string().nullable()`

---

## Refactoring

### P1 — Prioritaires

- [x] **REF-P1-1 — `new X()` inline dans les controllers (pas d'`@inject()`)**
  - Concerne ~95 % des controllers : `boats_controller.ts`, `ai_controller.ts`, `ports_controller.ts`, `boat_maintenances_controller.ts`, `boat_maintenance_tasks_controller.ts`, `boat_maintenance_sheets_controller.ts`, `boat_equipment_controller.ts`, `boat_media_controller.ts`, `mouillages_controller.ts`, `pontoons_controller.ts`, `new_account_controller.ts`, `password_reset_controller.ts`
  - Fix : ajouter `@inject()` + déclarer chaque service en constructeur (modèle : `BoatsController` pour `BoatService`)

- [x] **REF-P1-2 — Classes d'erreur dans les services au lieu de `app/exceptions/`**
  - `app/services/boat_service.ts` → `BoatNotFoundError`, `BoatEquipmentNotFoundError`
  - `app/services/boat_maintenance_service.ts` → `BoatMaintenanceNotFoundError`, `BoatMaintenanceValidationError`
  - `app/services/boat_maintenance_task_service.ts` → `BoatMaintenanceTaskNotFoundError`, `BoatMaintenanceTaskValidationError`
  - `app/services/boat_maintenance_sheet_service.ts` → `BoatMaintenanceSheetNotFoundError`, `BoatMaintenanceSheetItemNotFoundError`
  - `app/services/media_service.ts` → `MediaNotFoundError`
  - Fix : créer `app/exceptions/boat_errors.ts`, `maintenance_errors.ts`, `media_errors.ts` ; modèle : `app/exceptions/port_errors.ts`

- [x] **REF-P1-3 — Types payload dans les services au lieu de `shared/types/`**
  - `app/services/boat_service.ts:23` → `BoatHullPayload`, `BoatEnginePayload`, `BoatSailPayload`, `BoatRigPayload`, `BoatEnginePartPayload`, `BoatSafetyEquipmentPayload`
  - `app/services/boat_maintenance_service.ts` → `CreateMaintenancePayload`
  - Fix : créer `shared/types/boat.ts`, `shared/types/maintenance.ts` et y déplacer ces types

- [x] **REF-P1-4 — Interfaces définies inline dans des controllers**
  - `app/controllers/planning_controller.ts:6` → `interface PlanningTask`
  - `app/controllers/maintenance_history_controller.ts:5` → `interface MaintenanceHistoryEvent`, `MaintenanceHistoryStats`
  - Fix : déplacer dans `shared/types/planning.ts` (à créer)

- [x] **REF-P1-5 — `payload.subject as any`** `app/controllers/boat_maintenance_tasks_controller.ts:36`
  - Fix : utiliser `vine.enum([...] as const)` dans le validator pour que TypeScript infère le bon type, ou caster vers `MaintenanceTaskSubject` explicitement

- [x] **REF-P1-6 — Controllers important des modèles Lucid directement**
  - Violation de la règle CLAUDE.md : "Jamais de `Model.query()` dans un Controller → déléguer au Service"
  - Fichiers concernés :
    - `app/controllers/session_controller.ts` → `User`
    - `app/controllers/boat_media_controller.ts` → `Media`, `Organization`
    - `app/controllers/pontoons_controller.ts` → `Pontoon`, `Port`
    - `app/controllers/boats_controller.ts` → `Boat`, `BoatPositionHistory`, `Port`, `Spot`
    - `app/controllers/planning_controller.ts` → `BoatMaintenanceTask`, `Boat`
    - `app/controllers/password_reset_controller.ts` → `User`
    - `app/controllers/boat_equipment_controller.ts` → `BoatMaintenanceEvent`, `BoatMaintenanceTask`, `Media`
    - `app/controllers/ports_controller.ts` → `Port`
    - `app/controllers/maintenance_history_controller.ts` → `Boat`, `BoatMaintenanceEvent`
    - `app/controllers/mouillages_controller.ts` → `Mouillage`, `Port`
    - `app/controllers/spots_controller.ts` → `Mouillage`, `Pontoon`, `Port`, `Spot`
  - Fix : déplacer chaque accès modèle dans le service correspondant (créer le service si absent) ; le controller n'appelle que des méthodes de service injectées

- [x] **REF-P1-7 — Modèles Lucid importés statiquement dans les services au lieu de l'injection de dépendance**
  - Pattern attendu : `constructor(private Boat: typeof Boat)` avec `@inject()` sur la classe
  - Fichiers concernés :
    - `app/services/boat_service.ts` → `Boat`, `BoatEngine`, `BoatRig`, `BoatSail`
    - `app/services/boat_maintenance_service.ts` → `BoatEngine`, `BoatMaintenanceEvent`, `BoatMaintenancePart`, `BoatRig`, `BoatSail`
    - `app/services/boat_maintenance_sheet_service.ts` → `BoatMaintenanceSheet`, `BoatMaintenanceSheetItem`
    - `app/services/boat_maintenance_task_service.ts` → `BoatMaintenanceTask`
    - `app/services/boat_maintenance_badge_service.ts` → `BoatEngine`, `BoatMaintenanceTask`
    - `app/services/boat_list_service.ts` → `Boat`
    - `app/services/dashboard_service.ts` → `Boat`, `BoatEngine`, `BoatMaintenanceTask`
    - `app/services/media_service.ts` → `Media`
    - `app/services/mouillage_service.ts` → `Boat`, `Mouillage`, `Spot`
    - `app/services/organization_service.ts` → `Organization`
    - `app/services/password_reset_service.ts` → `PasswordResetToken`, `User`
    - `app/services/pontoon_service.ts` → `Boat`, `Pontoon`, `Spot`
    - `app/services/port_service.ts` → `Boat`, `Mouillage`, `Pontoon`, `Port`, `Spot`
    - `app/services/queue_dedup_service.ts` → `QueueDedupKey`
    - `app/services/spot_service.ts` → `Spot`
    - `app/services/user_service.ts` → `User`
    - `app/services/ai_analysis_service.ts` → `AiAnalysis`
  - Fix : ajouter `@inject()` sur chaque service + déclarer chaque modèle en paramètre constructeur `private Model: typeof XModel` ; les `import type` peuvent rester

### P2 — Importants

- [x] **REF-P2-1 — N+1 queries dans `boats_controller#show`** `app/controllers/boats_controller.ts:82`
  - 8+ requêtes en cascade : chargement bateau → engines/sails/rig → maintenance → tasks → sheets → media → safetyEquipment → positionHistory
  - Fix : factoriser dans `BoatService.getFullDetailForUser()` + `Promise.all` pour les requêtes indépendantes

- [x] **REF-P2-2 — Pattern `loadBoat()` dupliqué ×6**
  - Présent dans : `boat_equipment_controller.ts`, `boat_media_controller.ts`, `boat_engine_parts_controller.ts`, `boat_safety_equipment_controller.ts`, `boat_maintenance_sheets_controller.ts`, `boat_maintenance_sheet_items_controller.ts`
  - Fix : extraire dans un middleware ou helper partagé `loadBoatOrRedirect(ctx)`

- [x] **REF-P2-3 — Logique métier dans des controllers**
  - `app/controllers/planning_controller.ts` : méthodes `isOverdue()`, `isSoon()` avec logique de date
  - `app/controllers/maintenance_history_controller.ts` : agrégation de stats (`totalParts`, `distinctBoatIds`)
  - Fix : créer `PlanningService` ; enrichir `BoatMaintenanceService` avec les méthodes d'agrégation

- [x] **REF-P2-4 — `any` dans les raw queries**
  - `app/services/boat_maintenance_badge_service.ts:57,113`
  - `app/services/dashboard_service.ts:110`
  - `app/services/boat_list_service.ts:109`
  - Fix : déclarer des interfaces locales pour les rows Knex bruts (ex: `interface BadgeRow { boatId: number; nextDueAt: string | null }`)

- [x] **REF-P2-5 — `shared/types/` incomplet**
  - Manquent : `shared/types/boat.ts`, `shared/types/maintenance.ts`, `shared/types/planning.ts`, `shared/types/media.ts`
  - Note : dépendance de REF-P1-3 et REF-P1-4 — à traiter ensemble

- [x] **REF-P2-6 — Pattern de vérification d'organisation dupliqué dans les controllers port/pontoon/mouillage**
  - Présent dans : `ports_controller.ts`, `pontoons_controller.ts`, `mouillages_controller.ts`, `spots_controller.ts`
  - Fix : ajouter `getForUserOrFail()` dans `PontoonService` et `MouillageService` sur le modèle de `BoatService.getForUserOrFail()`

### P3 — Suggestions

- [x] **REF-P3-1 — `boats_controller#show` ~200 lignes** `app/controllers/boats_controller.ts:82`
  - Fix : créer `app/transformers/boat_transformer.ts` avec `toShowProps(boat, ...)` + sous-méthodes par entité

- [x] **REF-P3-2 — Import dynamique de `BoatEnginePart`** `app/services/boat_service.ts:418,439,460,469,487`
  - `await import('#models/boat_engine_part')` dans des méthodes → import statique en haut du fichier

- [x] **REF-P3-3 — `BoatService` 513 lignes — candidat à décomposition**
  - Gère hull, engines, sails, rig, engine parts, safety equipment
  - Fix : extraire `BoatHullService`, `BoatEquipmentService`

- [x] **REF-P3-4 — `new AiService()` inline dans `ai_analysis_service.ts`**
  - Fix : injecter `AiService` via le constructeur avec `@inject()`

- [x] **REF-P3-5 — `start/routes/marketing.ts` 1000+ lignes**
  - `buildHomePageData`, `buildPricingPageData`, `buildAboutPageData`, `buildContactPageData` dans un fichier de routes
  - Fix : extraire en `app/controllers/marketing_controller.ts` + classes builder dédiées

---

## Ordre de traitement recommandé

1. **SEC-H1** (header injection — rapide, haut risque)
2. **SEC-H2** (login validator — rapide)
3. **SEC-M1** (rate limiting — impacte auth + coûts IA)
4. **REF-P1-2** (déplacer les classes d'erreur vers `app/exceptions/`)
5. **REF-P1-3 + REF-P2-5** (créer les fichiers `shared/types/` manquants)
6. **REF-P1-4** (interfaces inline dans controllers)
7. **REF-P1-1** (`@inject()` sur tous les controllers — gros chantier, faire par domaine)
8. **REF-P1-6** (supprimer tous les imports de modèles dans les controllers — faire domaine par domaine, en même temps que REF-P1-7)
9. **REF-P1-7** (injecter les modèles Lucid via `@inject()` dans les services — faire service par service)
10. **REF-P2-2** (`loadBoat()` dupliqué)
11. **REF-P2-3** (logique métier dans controllers)
12. **SEC-H3** (CSP — nécessite de cartographier toutes les origines tierces)
13. **SEC-M2** (AI controller — Inertia + validation messages)
14. **REF-P1-5** (`as any` sur subject)
15. **REF-P2-1** (N+1 queries)
16. **REF-P2-4** (`any` dans raw queries)
17. **REF-P2-6** (pattern organisation dupliqué)
18. **SEC-M3, SEC-M4, SEC-M5** (medium, moins urgents)
19. **SEC-L1, SEC-L2** (low)
20. **REF-P3-*** (suggestions, au fil des passages)
