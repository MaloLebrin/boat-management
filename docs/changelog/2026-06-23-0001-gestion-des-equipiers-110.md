# 2026-06-23 — Gestion des équipiers #110

**Backend**

- `database/migrations/1799000000000_create_crew_members_table.ts` — table `crew_members` : `organization_id` (FK CASCADE), `first_name`, `last_name`, `email` (nullable), `phone` (nullable), `notes` (text nullable)
- `database/migrations/1799000001000_create_crew_certifications_table.ts` — table `crew_certifications` : `crew_member_id` (FK CASCADE), `type` (enum : `coastal_permit | offshore_permit | vhf | stcw_basic | stcw_proficiency | other`), `reference_number` (nullable), `expires_at` (date nullable, indexé)
- `database/migrations/1799000002000_create_navigation_log_crew_table.ts` — table pivot `navigation_log_crew` : `navigation_log_id` (FK CASCADE), `crew_member_id` (FK CASCADE), `role` (enum : `skipper | crew | passenger`, défaut `crew`), contrainte unique `(navigation_log_id, crew_member_id)`
- `app/models/crew_member.ts` — modèle Lucid avec `hasMany(() => CrewCertification)` et `manyToMany(() => NavigationLog)`
- `app/models/crew_certification.ts` — modèle Lucid avec getters calculés `isExpired` et `expiresInDays`
- `app/models/navigation_log.ts` — ajout relation `manyToMany(() => CrewMember, { pivotTable: 'navigation_log_crew', pivotColumns: ['role'] })`
- `shared/types/crew.ts` — types `CrewMemberRow`, `CrewCertificationRow`, `NavigationLogCrewRow`, `CrewMemberOption`, payloads CRUD, enums `CrewCertificationType`, `NavigationLogCrewRole`
- `shared/types/navigation_log.ts` — ajout du champ `crew: NavigationLogCrewRow[]` dans `NavigationLogRow`
- `app/exceptions/crew_errors.ts` — `CrewMemberNotFoundError`, `CrewCertificationNotFoundError`
- `app/validators/crew.ts` — `createCrewMemberValidator`, `updateCrewMemberValidator`, `createCrewCertificationValidator`, `syncNavigationLogCrewValidator`
- `app/policies/crew_member_policy.ts` — `create`/`update` (membres de l'orga), `delete` (admin uniquement)
- `app/services/crew_service.ts` — CRUD équipiers, gestion certifications, `syncCrewForNavigationLog()`, `listOptionsForOrganization()`
- `app/services/crew_role_pdf_service.ts` — génération PDF rôle d'équipage (PDFKit), format tableau avec nom/rôle/email, en-tête de sortie
- `app/services/navigation_log_service.ts` — ajout `getForBoat()`, preload `crew` dans `listForBoat()`
- `app/controllers/crew_members_controller.ts` — `index`, `store`, `update`, `destroy`
- `app/controllers/crew_certifications_controller.ts` — `store`, `destroy`
- `app/controllers/navigation_log_crew_controller.ts` — `sync` (PATCH, remplace tout l'équipage de la sortie)
- `app/controllers/crew_role_pdf_controller.ts` — `download` (GET, retourne PDF)
- `app/transformers/boat_transformer.ts` — ajout `crewMemberOptions` dans `BoatShowContext`, crew dans `toNavigationLog()`
- `app/controllers/boats_controller.ts` — injection `CrewService`, chargement `crewMemberOptions` dans `show()`
- `start/routes/crew.ts` — routes `/crew` CRUD + certifications
- `start/routes/boats.ts` — ajout `PATCH /boats/:boatId/navigation-logs/:logId/crew`, `GET /boats/:boatId/navigation-logs/:logId/crew-role.pdf`
- `start/routes.ts` — import `./routes/crew.js`

**Frontend**

- `inertia/pages/organization/crew.vue` — page liste équipiers avec CRUD inline et gestion des certifications par membre
- `inertia/components/crew/CrewMemberForm.vue` — formulaire création/édition équipier
- `inertia/components/crew/CrewCertificationForm.vue` — formulaire ajout de certification (type, référence, expiration)
- `inertia/components/crew/CrewCertificationBadge.vue` — badge statut certification (valide / expire bientôt / expirée)
- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` — panel gestion équipage d'une sortie (ajout/suppression membres avec rôle, lien PDF)
- `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue` — ajout `crewMemberOptions` prop + intégration `NavigationLogCrewPanel`
- `inertia/components/boats/show/BoatShowTabContent.vue` — prop `crewMemberOptions` transmise
- `inertia/pages/boats/show.vue` — prop `crewMemberOptions` déclarée
- `inertia/composables/use_nav_sections.ts` — ajout entrée "Équipiers" `/crew` dans section FLOTTE
- `inertia/components/layout/NavIcon.vue` — ajout icône `people`

**i18n**

- `resources/lang/fr/crew.json`, `resources/lang/en/crew.json` — toutes les clés équipiers/certifications/PDF
- `resources/lang/fr/nav.json`, `resources/lang/en/nav.json` — clé `crew`
- `resources/lang/fr/flash.json`, `resources/lang/en/flash.json` — namespace `crew`

---
