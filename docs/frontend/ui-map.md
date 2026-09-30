# Frontend — UI map (Inertia/Vue)

## Entrée Inertia

Référence: `inertia/app.ts`.

- résout les pages via `./pages/${name}.vue` et `import.meta.glob('./pages/**/*.vue')`
- applique le layout par défaut `inertia/layouts/default.vue`
- SSR activé (`config/inertia.ts` : `ssr.enabled: true`, entrypoint `inertia/ssr.ts`)
- hydratation (#835) : `pickVueAppFactory(el)` (`inertia/utils/vue_app_factory.ts`) choisit `createSSRApp` quand le conteneur contient déjà le HTML serveur, `createApp` sinon — `createApp` seul remontait tout l'arbre au lieu de l'hydrater. Tout composant dont le rendu diffère entre serveur et client (`window`, dates locales, `Math.random`…) lève un « Hydration mismatch » en dev : le corriger (`onMounted`, `useMounted()`…), ne pas l'ignorer
- `<Teleport to="body">` : le SSR d'Inertia n'injecte que `#app`, le contenu téléporté côté serveur est perdu — le désactiver jusqu'au montage (`:disabled="!isMounted"`, cf. `BaseModal`)

## Pages principales

### Auth — inscription (#448)

- Page: `inertia/pages/auth/signup.vue` — `<Form route="new_account.store">`, backend `NewAccountController.store` + `signupValidator`
- Sections (la page reste sous la limite de 250 lignes) :
  - `components/auth/signup/SignupIdentityFields.vue` — `firstName`, `lastName`, `email`, `password` (+ `PasswordStrength`, bouton Afficher/Masquer). Les bornes du mot de passe (placeholder, hint, `minlength`/`maxlength`) sont interpolées depuis `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` (`shared/constants/auth.ts`), les mêmes constantes que le validator (#455)
  - `components/auth/signup/SignupOrganizationFields.vue` — `organizationName`, `organizationType`, `fleetSize` ; les options des deux selects sont générées depuis `ORGANIZATION_TYPES` / `FLEET_SIZES` (`shared/types/organization.ts`), les mêmes constantes que le validator
  - `pages/auth/verify_email.vue` (`/verify-email`) — écran de rappel et renvoi du lien (#768), layout applicatif. Le rappel permanent est `components/layout/EmailVerificationBanner.vue`, monté dans `layouts/default.vue` et piloté par le booléen `user.emailVerified` de la prop partagée : un visiteur anonyme n'a pas de `user`, la bannière ne s'affiche donc jamais sur les écrans publics. Sans ce rappel, l'utilisateur découvrirait la garde au moment d'envoyer sa première facture, sans savoir quoi faire
  - `components/auth/signup/SignupTermsCheckbox.vue` — case `acceptTerms` avec son propre emplacement d'erreur ; les mentions CGU / confidentialité sont des `<Link>` localisés (`/fr/cgu`•`/en/terms`, `/fr/confidentialite`•`/en/privacy`) ouverts dans un nouvel onglet pour ne pas perdre le formulaire (#455)
  - `components/auth/signup/SignupSectionHeader.vue` — en-tête numéroté « 01 / 02 »
- Puces du plan gratuit sous le bouton (`STARTER_FEATURES`) : construites depuis `PLAN_LIMITS.starter` (bateaux, membres) avec des clés ICU au pluriel — la page annonçait « utilisateurs illimités » alors que Starter en autorise 1 (#455)
- `components/base/BaseFormErrorSummary.vue` en tête de formulaire : reçoit `handled-keys` (les champs qui affichent déjà leur erreur sous l'input) et rend en bandeau `danger` **toutes les autres** erreurs. Sans lui, un champ de validator sans input rend l'échec invisible — c'est exactement le bug #448. Réutilisable sur tout formulaire Inertia.

### Dashboard

- Page: `inertia/pages/dashboard.vue` — orchestration seule : rend `layout.order[zone]` moins `layout.hidden` (disposition **par utilisateur**, résolue côté serveur) via `DashboardWidgetColumn.vue` → `DashboardWidgetFrame.vue` → `DashboardWidget.vue` (branches typées par id, aucun rendu métier inline) ; regroupement générique des widgets `half` consécutifs (`groupDashboardWidgets`, ligne `dashboard-half-row`) (#828, #832)
- **Mode édition en place** (façon iOS) : « Personnaliser » (`data-testid="dashboard-customize"`, compteur de widgets masqués) fait entrer la page en édition — chaque widget visible est encadré (`DashboardWidgetFrame.vue` : contenu **inerte** `inert` + `pointer-events-none`, oscillation `.dashboard-editing` coupée sous reduced-motion, badge « − » `dashboard-widget-remove`, flèches `dashboard-widget-up/down` ; les KPI se retirent seulement), `DashboardEditToolbar.vue` remplace « Personnaliser » et « + Créer » (« + Ajouter un widget » → `DashboardAddWidgetModal.vue`, galerie des widgets retirés par zone avec `dashboard.widgetDescriptions.*` ; « Réinitialiser » → `DELETE /dashboard/layout` ; « Annuler » / `Échap` ; « Terminé » → un seul `PUT /dashboard/layout` s'il y a un changement). Brouillon local dans `useDashboardLayout` (`inertia/composables/use_dashboard_layout.ts`) ; un widget réajouté dont la donnée a été omise côté serveur montre `DashboardWidgetPlaceholder.vue` jusqu'à l'enregistrement. Registre et résolveur partagés : `shared/constants/dashboard_widgets.ts`, `shared/helpers/dashboard_layout.ts`
- Props: `boats`, `stats` (+ `deltas`), `attention`, `pulse`, `activeTrips`, `fleetStatus`, `upcomingReservations?` (absent sans module Location), `activity?` (prop différée, groupe `activity`), `canViewSpend`, `spend?` (prop différée, groupe `spend`, admins seulement), `aiFleetAnalysis`, `aiFleetAnalysisAt`, `ports`, `portStats`, `portOptions`, `canCreateNavigationLogs`, `canCreateIncidents`, `canCreateMaintenanceTasks`, `taskEquipment?` (prop optionnelle, ajout rapide de tâche), `canAddBoat`, `boatQuota`
- Source backend: `HomeController.index` → `DashboardLayoutService` (disponibilité + disposition résolue, prop `layout`), `DashboardService` (+ `getPlannedTasks`), `DashboardAttentionService`, `DashboardFleetActivityService`, `BoatReservationService.listUpcomingForOrg`, `BudgetService.getOrgSpendSummary` — règles dans `docs/domain/dashboard.md`
- Structure : en-tête → KPI → grille `xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start`. Colonne principale : À traiter → grille « aujourd'hui » (`md:grid-cols-2` quand le module Location est actif : En mer + Prochains départs) → Activité récente → Vos bateaux ; colonne latérale : Assistant IA → Dépenses (admins) → Ports. Sous `xl` tout s'empile dans cet ordre ; la table bateaux revient dès `lg` (motif #493).
- Props différées : `prop === undefined` = pas encore arrivée → `BaseSkeleton` (`DashboardActivityCard`, `DashboardSpendCard`, `DashboardPlannedTasksCard`) ; les gardes de rôle / plan / module **et** les widgets masqués omettent la prop côté serveur — la page ne rend que ce que `layout` liste, elle ne consulte plus `usePlan()`.
- Composants (`inertia/components/dashboard/`) :
  - En-tête: `DashboardHeader.vue` — `h1` + date du jour (`formatDateLong`, calculée en `onMounted` pour éviter un mismatch d'hydratation) + slot `actions` (« Personnaliser » + menu « + Créer », `DashboardQuickAddActions.vue` ; en édition, `DashboardEditToolbar.vue`)
  - KPIs: `DashboardStatsGrid.vue` — 4 `BaseStatCard` en `grid-cols-2 lg:grid-cols-4` : Bateaux (→ `/boats`, delta « N en mer · N en alerte », `warning` si alerte), Sorties 30 j (→ `/navigation/logbook`, milles), Tâches réalisées 30 j (→ `/planning`, retards), Incidents ouverts (→ `/navigation/incidents`, en cours). Badge seulement hors ton `neutral`
  - À traiter: `DashboardAttentionCard.vue` — titre + total, `DashboardAttentionChips.vue` (puces par type avec compteur et lien « voir tout » : `/planning`, `/navigation/incidents`, `/invoices?status=overdue` ; la puce documents est un simple compteur ; pseudo-zone `pointer-coarse:` 44 px), « Voir le planning » ; liste de `DashboardAttentionRow.vue` (ligne entière = `<Link>`, pastille par type/sévérité, détail daté) ; pied « N autres éléments comptés ci-dessus »
  - En mer: `DashboardAtSeaCard.vue` — ligne d'état flotte, `DashboardActiveTripRow.vue` (→ `/boats/:id/navigation`, « parti il y a … » en `onMounted`), état vide avec CTA ouvrant sa propre `QuickAddNavigationLogModal` (si `canCreateNavigationLogs` et au moins un bateau)
  - Prochains départs: `DashboardUpcomingReservationsCard.vue` — module Location, lignes → `/reservations?boatId=`, `ReservationStatusBadge`
  - Activité: `DashboardActivityCard.vue` + `DashboardActivityRow.vue` — 5 sortes d'événements, temps relatif `useNotificationHelpers().formatRelativeTime` en `onMounted`
  - Dépenses: `DashboardSpendCard.vue` + `DashboardSpendBar.vue` — total, delta N-1 (hausse en `danger`, baisse en `success`, même règle que `BudgetCategoryCard`), barres par poste triées (tons moyens des palettes : `bg-amber-500`, `bg-sky-500`, `bg-lilac-500`, `bg-violet-500`, `bg-mint-500`, `bg-peach-500`), lien « Voir le budget du bateau » seulement pour une flotte d'un seul bateau
  - Bateaux: `DashboardBoatsCard.vue` — table `hidden lg:block` + cartes `lg:hidden space-y-3` `DashboardBoatCard.vue` (motif #493)
  - Assistant IA: `DashboardAiPanel.vue` — panneau navy **permanent** (cf. `CLAUDE.md`), état propre (`isAnalyzing`, garde `canUseAI` → `UpgradePlanModal`), POST `/ai/fleet-analysis` ; affiche « Dernière analyse le … » quand `aiFleetAnalysisAt` est fourni
  - Ports: `PortDashboardCard.vue` — réservée aux plans avec `canManagePorts` (#604), garde tranchée côté serveur (`DashboardLayoutService.availabilityFor`)
  - Tâches planifiées: `DashboardPlannedTasksCard.vue` — tâches ouvertes datées des 30 prochains jours (`PLANNED_TASKS_DAYS`), 5 lignes → `/planning?task=<id>`, « +N autres », squelette tant que `plannedTasks` est `undefined`
  - Notifications: `DashboardNotificationsCard.vue` — dernières notifications non lues depuis la prop partagée `notifications` (`useNotifications()`), clic via `inertia/utils/notification_navigation.ts` (marquer lue puis naviguer si chemin interne sûr, partagé avec `NotificationPanel`)
  - **Galerie (masqués par défaut, `defaultHidden`)** — toutes à squelette tant que la prop différée est `undefined`, tenant-lieu en édition :
    - Conformité sécurité: `DashboardSafetyComplianceCard.vue` — ligne « N conformes · N à vérifier · N sans zone », lignes → `/boats/:id?tab=safety` (badges écarts bloquants `danger` / échéances `warning`, score, prochaine échéance), invitation à renseigner la zone d'armement quand aucun bateau n'est contrôlé, « +N autres »
    - Carburant: `DashboardFuelCard.vue` — litres en grand, delta vs 30 j précédents (hausse `danger`, baisse `success`, règle « Dépenses »), coût, prix moyen/L, pleins, bateau le plus avitaillé → `/boats/:id`, lien `/navigation/fuel`
    - Pièces manquantes: `DashboardLowStockCard.vue` — puces « N en rupture » / « N à remplacer », lignes → `/boats/:boatId/engines/:engineId?tab=parts` (badge stock/seuil ou état d'usure via `wearStateVariant`), lien `/spare-parts`, « +N autres »
    - Facturation: `DashboardInvoicingCard.vue` — module CRM/Facturation, 4 tuiles `<Link>` : encours `/invoices?status=sent`, impayées `/invoices?status=overdue` (`danger` si > 0), encaissé ce mois `/invoices?status=paid`, devis `/invoices?kind=quote`
    - Occupation location: `DashboardCharterOccupancyCard.vue` — module Location, taux en grand + barre `bg-brand` (`role="progressbar"`), jours-bateau, confirmées / options / CA confirmé, lien `/reservations`
- Tests : `dashboard_page_layout.spec.ts` (ordre par défaut, ordre personnalisé, lignes `half`, mode édition), `dashboard_widget_frame`, `dashboard_edit_toolbar`, `dashboard_add_widget_modal`, `use_dashboard_layout`, `dashboard_planned_tasks_card`, `dashboard_notifications_card`, `dashboard_safety_compliance_card`, `dashboard_fuel_card`, `dashboard_low_stock_card`, `dashboard_invoicing_card`, `dashboard_charter_occupancy_card`, `dashboard_attention_card`, `dashboard_stats_grid`, `dashboard_at_sea_card`, `dashboard_upcoming_reservations_card`, `dashboard_activity_card`, `dashboard_spend_card`, `dashboard_ai_panel_analysed_at`, `dashboard_header`, `dashboard_boats_card`, `dashboard_ports_card_plan` ; fonctionnel `tests/functional/dashboard/dashboard_props.spec.ts` (gardes, groupes différés), `dashboard_layout.spec.ts` (PUT/DELETE, assainissement, props omises, `plannedTasks`, widgets de la galerie masqués par défaut puis différés une fois ajoutés) ; navigateur `dashboard_card_links.spec.ts` (KPI, À traiter → planning), `mobile_field.spec.ts` (non-débordement, cartes bateaux), `touch_targets.spec.ts`

### Planning (`/planning`, #869)

- Page `inertia/pages/planning/index.vue` ; barre `PlanningToolbar.vue` (filtres « Assigné à » et bateau, bouton « Réservations », groupement, bascule kanban/calendrier)
- Kanban : `PlanningKanban.vue` → cinq `PlanningKanbanColumn.vue` (« Bientôt », « Planifiées », « Non datées » portent `data-drop-zone`) ; `PlanningTaskCard.vue` porte la poignée de glisser (`planning-task-drag-handle`, 44 px, `touch-none`, capability `maintenance.edit`) et la mention de conflit « Pendant une location »
- Calendrier : `PlanningCalendar.vue` (navigation `useMonthNav`, agenda mobile, tâches sans date, `PlanningCalendarHourTasks.vue`) → `PlanningCalendarGrid.vue` (grille desktop, cases `day:YYYY-MM-DD` déposables, bandes de réservations)
- `AvailabilityBand.vue` : bande d'indisponibilité commune au planning (réservations) et à la frise `/reservations` (entretiens planifiés, `ReservationTimelineRow.vue`)
- Composables : `use_pointer_drag.ts` (Pointer Events, souris et tactile), `use_planning_reschedule.ts` (PATCH partiel, rendu optimiste, confirmation de conflit) ; utils `planning_columns.ts`, `planning_reservations.ts` ; calculs purs `shared/helpers/planning_schedule.ts`
- Doc : `docs/domain/planning.md`

### Boats (liste / création / édition)

- `boats/index`: `inertia/pages/boats/index.vue`
  - disponibilité (#870) : filtre « Statut » dans `BoatListToolbar.vue` (vide = flotte active, hors vendus), colonne « Disponibilité » dans `BoatTable.vue`, badge sur `BoatCards.vue` quand le bateau n'est pas disponible — tous via `inertia/components/boats/BoatStatusBadge.vue` (`boatStatusVariant`)
  - corbeille (#858) : lien « Corbeille » (capacité `boats.delete`) vers `?trashed=1`. Le nom n'est plus un lien. `BoatTrashActions.vue` restaure (`POST /boats/:id/restore`) et purge (`DELETE /boats/:id/force`, confirmation). Le toast de suppression porte « Annuler » (`flash.successAction`)
  - props: `boats[]`
  - backend: `BoatsController.index` → `BoatService.listForUser`
  - filtre catégorie (#571) : `BoatListToolbar` propose les libellés traduits de `BOAT_CATEGORIES`
    (`useBoatOptions().categoryOptions`) et navigue en `?category=`. Il ne reconstruit plus ses
    options depuis les valeurs distinctes de la page. `BoatTable` / `BoatCards` affichent la
    catégorie traduite via `~/utils/boat_category_label`.
- `boats/new`: `inertia/pages/boats/new.vue`
  - form POST `/boats`
  - composant: `BoatFormHullFields`, qui délègue l'identité à
    `inertia/components/boats/hull/BoatFormIdentityFields.vue` (#571) — catégorie en `BaseSelect`,
    constructeur et modèle en `BaseCombobox`. Les modèles de la marque retenue arrivent par
    `router.reload({ only: ['catalogModels'], data: { brandId } })` ; **une saisie hors catalogue
    est acceptée telle quelle**.
  - `inertia/components/boats/hull/BoatFormLegalFields.vue` — le **pavillon** est un `BaseSelect`
    de pays ISO 3166-1 alimenté par `useCountries()` (#580), option vide comprise ; ce n'est plus
    un champ texte libre
  - props catalogue: `brands`, `catalogModels`, `catalogBrandId`
  - backend: `BoatsController.store`
- `boats/edit`: `inertia/pages/boats/edit.vue`
  - form PUT `/boats/:id`
  - delete via form DELETE `/boats/:id`
  - mêmes props catalogue que `boats/new` ; `catalogBrandId` vient de
    `BoatCatalogService.resolveBrand(boat.manufacturer)` pour que la liste des modèles soit utile
    dès l'ouverture
  - backend: `BoatsController.update` / `BoatsController.destroy`

### Boat show (équipement + maintenance)

- Page: `inertia/pages/boats/show.vue`
  - disponibilité (#870) : `inertia/components/boats/show/availability/BoatAvailabilityControl.vue` dans l'en-tête (badge + lien « Changer le statut » → `BoatStatusModal.vue`, statut, motif et historique, `PATCH /boats/:id/status`) ; `BoatAvailabilityBanner.vue` sous l'en-tête (statut immobilisant, tâches datées, incidents ouverts), réutilisé sur `boats/reservations`
- Composants:
  - photos (#811) : onglet principal « Photos » (`?tab=photos`, groupe `photos` juste après Aperçu dans `inertia/composables/use_boat_show_tabs.ts`) rendu par `BoatShowTabContent.vue` → `inertia/components/boats/show/BoatPhotoGallery.vue` (galerie complète : ajout multiple, caméra, suppression). L'Aperçu n'en garde qu'une rangée : `inertia/components/boats/show/tabs/overview/BoatOverviewPhotoStrip.vue` (4 vignettes max triées par `position`, lien « Voir les N photos → » et tuile « Ajouter des photos » pour les gestionnaires, tous émettant `go-to-tab: 'photos'`). Tri partagé `inertia/utils/boat_photos.ts`. Après upload (`POST /boats/:boatId/photos`) ou suppression (`DELETE /boats/:boatId/media/:mediaId`), `BoatMediaController` redirige vers `?tab=photos` pour une photo et `?tab=documents` pour un document : on reste sur l'onglet courant
  - specs: `inertia/components/boats/hull/BoatShowSpecsCard.vue`
  - engines: `inertia/components/boats/engine/BoatShowEnginesCard.vue`
  - sails: `inertia/components/boats/sail/BoatShowSailsCard.vue`
  - rig: `inertia/components/boats/rig/BoatShowRigCard.vue`
  - maintenance: `inertia/components/boats/show/tabs/BoatShowTabTasks.vue` (onglet « Tâches ») et `inertia/components/boats/show/tabs/BoatShowTabHistory.vue` (onglet « Historique »)
  - actions d'une tâche (#407, #867) : `inertia/components/boats/maintenance/BoatTaskActions.vue` — « Marquer fait », « Reporter » (`MaintenanceTaskPostponeMenu.vue` : +1 semaine, +1 mois, date libre, tâches datées ouvertes), « Modifier » (`BoatMaintenanceTaskEditModal.vue`, tâches ouvertes) et suppression ; réutilisé par l'onglet Tâches, `BoatTaskUrgentCard`, `EquipmentTasksSection` et l'onglet maintenance du moteur. `PlanningTaskCard.vue` porte aussi « Reporter » (capability `maintenance.edit`) et « Reportée N fois »
  - ordre de travail (#868) : `MaintenanceWorkOrderFields.vue` (responsable, prestataire, coût et durée prévus) dans le formulaire de création et la modale d'édition ; `MaintenanceTaskWorkOrderSummary.vue` résume la ligne sous le titre (onglet Tâches, carte urgente, sections équipement) ; `BoatTaskActions` demande coût et durée réels à la clôture d'une tâche chiffrée. Planning : filtre « Assigné à » et pastille d'initiales sur `PlanningTaskCard` ; tableau de bord mécanicien : bascule « Mes tâches » ; widget « Tâches planifiées » : « Les miennes » ; budget : `PlannedMaintenanceSummary.vue` (page budget et carte Dépenses)
    - `BoatMaintenanceTasksPanel.vue` garde le point d'entrée de création et délègue le formulaire à `BoatMaintenanceTaskForm.vue` (#581)
    - le champ titre du formulaire de tâche et des modales d'événement (`BoatMaintenanceEventModal.vue`, `EngineMaintenanceEventModal.vue`) est une `BaseCombobox` alimentée par le catalogue d'opérations standard, via `inertia/composables/use_maintenance_operations.ts` (#581) — la saisie libre reste acceptée telle quelle
  - equipment-actions (onglet "Achats/réparations"):
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue` — carte individuelle action
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue` — modal création/édition (prop `prefill` pour l'ajout depuis un équipement, #313)
    - `inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue` — onglet liste avec filtres
  - onglet Équipement : `BoatShowTabEquipment.vue` héberge le modal d'action ; `BoatGenericEquipmentRow.vue` (extrait de `BoatGenericEquipmentCard.vue`) / `BoatSafetyEquipmentCard.vue` exposent un bouton « Ajouter à la liste » sur les items dégradés (#313)
  - incidents (#813) : `BoatShowTabIncidents.vue` ouvre `inertia/components/boats/incidents/BoatIncidentModal.vue` (→ `BoatIncidentForm.vue`, sélecteur de cible `IncidentTargetSelect.vue`) ; chaque carte d'équipement porte un bouton `EquipmentReportIncidentButton.vue` (modale verrouillée sur cet équipement, hébergée par `BoatShowTabEquipment.vue`) ; les pages équipement/pièce (`engine_show`, `sail_show`, `rig_show`, `generic_equipment_show`, `safety_equipment_show`, `engine_part_show`) posent `EquipmentIncidentAction.vue` dans leur en-tête ; le menu « + Ajouter » (`BoatShowHeaderActions.vue`) a une entrée « Un incident » (`BoatCreateIntent = 'incident'`) ; `IncidentTargetBadge.vue` rend la cible sur l'onglet, `IncidentRow.vue` et `IncidentCard.vue`. Les modales de `BoatSafetyEquipmentCard.vue` vivent dans `BoatSafetyEquipmentModals.vue`. Page de détail `inertia/pages/boats/incident_show.vue` (#814, `BoatIncidentsController.show`) : `IncidentShowHeader.vue` + `IncidentShowTabPhotos.vue` (→ `MediaPhotoGallery`), édition par `BoatIncidentModal` ; les cartes de l'onglet et `IncidentRow`/`IncidentCard` y mènent. Suites (#815) : `BoatIncidentCard.vue` (carte extraite de l'onglet, badge « n suites ») et `IncidentShowFollowUps.vue` (page de détail, sections « Tâches liées » / « Actions liées ») portent `IncidentFollowUpButtons.vue` (« Créer une tâche » / « Action à réparer ») et hébergent `BoatMaintenanceTaskModal` + `BoatEquipmentActionModal` pré-remplies par `inertia/utils/incident_follow_ups.ts`
  - filtre « Sécurité » : `BoatSafetyCompliancePanel.vue` (#582) rend le rapport Division 240 (prop `safetyCompliance` du squelette) au-dessus de `BoatSafetyEquipmentCard.vue`, qu'il pilote via `prefillEquipmentType` pour ouvrir la création pré-remplie sur un équipement manquant
- Props (types): `inertia/types/boat_show.ts`
- Source backend: `BoatsController.show`
- Chargement différé (#463) : les props d'onglet arrivent en deux groupes
  (`maintenance`, `navigation`) après le rendu du squelette et valent donc
  `undefined` au premier rendu. `BoatShowTabContent.vue` affiche un skeleton
  tant que le groupe dont dépend l'onglet actif n'est pas arrivé ; la table
  onglet → groupe vit dans `inertia/utils/boat_show_tab_data.ts`.
- Onglet initial : la prop `initialTab` (le `?tab=` vu par le serveur) fait foi,
  `window.location` n'est lu qu'en repli — c'est ce qui évite le flash d'Aperçu
  sur un lien profond rendu en SSR.

### Equipment edit pages

- engines: `inertia/pages/boats/engine_edit.vue` (PUT `/boats/:boatId/engines/:engineId`)
  - retour (#599): valider **et** annuler ramènent sur la fiche moteur
    `/boats/:boatId/engines/:engineId` — la plupart des points d'entrée du formulaire sont des
    écrans moteur. La création (`storeEngine`) reste sur la fiche bateau, d'où part sa modale.
  - champs partagés: `inertia/components/boats/engine/BoatEquipmentEngineFields.vue`, monté aussi
    par `BoatShowEnginesCard.vue` et `BoatEquipmentAddModal.vue`
  - identité (#573): `inertia/components/boats/engine/BoatEngineIdentityFields.vue` — marque et
    modèle en `BaseCombobox`, modèles chargés par
    `router.reload({ only: ['engineCatalogModels', 'engineCatalogBrandId'], data: { engineBrandId } })` ;
    **une saisie hors catalogue est acceptée telle quelle**. Retenir un modèle pré-remplit
    puissance, carburant, cycle et **motorisation** (#574) **uniquement s'ils sont vides**, et pose
    `engineModelId` en champ caché ; retaper marque ou modèle relâche ce rattachement
  - motorisation (#574): `<select name="family">` facultatif (« — » = je ne sais pas), options
    `BOAT_ENGINE_FAMILY_OPTIONS` libellées par `boats.options.engineFamily.*`. C'est ce champ, et
    non `kind`, qui décide de la nomenclature de pièces détachées ; le libellé est rappelé dans
    l'onglet Caractéristiques de la fiche moteur
  - props catalogue lues dans les props de page via `inertia/composables/use_engine_catalog.ts` —
    le formulaire est monté à quatre niveaux sous `boats/show`, elles ne descendent pas de main en
    main
  - la visite partielle **remonte le sous-arbre du formulaire** sur cette application (comportement
    préexistant, identique sur le formulaire bateau de #571) :
    `inertia/composables/use_engine_form_draft.ts` range la saisie en cours dans l'historique
    Inertia (`useRemember`) et fait rouvrir les modales depuis l'URL (`?engineForm=<surface>`)
- generic equipment (#577): `inertia/components/boats/equipment/BoatGenericEquipmentFields.vue`,
  monté par `BoatGenericEquipmentCard.vue` (modales création/édition) et `BoatEquipmentAddModal.vue`
  - la **catégorie est un select** (`GENERIC_EQUIPMENT_CATEGORY_OPTIONS`) partout sauf dans la
    modale d'ajout, où les pastilles la choisissent (champ caché, prop `category-locked`)
  - identité: `BoatGenericEquipmentIdentityFields.vue` — marque et modèle en `BaseCombobox`,
    modèles chargés par
    `router.reload({ only: ['equipmentCatalogModels', 'equipmentCatalogBrandId'], data: { equipmentBrandId } })` ;
    **une saisie hors catalogue est acceptée telle quelle**. Les marques de la catégorie de
    l'équipement remontent en tête sans jamais filtrer ; retaper marque ou modèle relâche le
    rattachement `equipmentModelId`
  - props catalogue lues dans les props de page via `inertia/composables/use_equipment_catalog.ts` ;
    brouillon et réouverture des modales via `use_generic_equipment_form_draft.ts`
    (`?equipmentForm=<surface>`), même mécanique que le formulaire moteur
- sails: `inertia/pages/boats/sail_edit.vue` (PUT `/boats/:boatId/sails/:sailId`)
  - champs partagés `inertia/components/boats/sail/BoatEquipmentSailFields.vue` (aussi montés par
    la carte Voiles et la modale d'ajout de `boats/show`) : voilerie en `BaseCombobox` nourrie par
    le référentiel `sail_lofts` (#578, alias cherchables, saisie libre acceptée, hidden
    `sailLoftId` relâché au retapage), matériau en `BaseSelect` fermé sur `SAIL_MATERIALS` ;
    props lues via `inertia/composables/use_sail_lofts.ts`
- rig: `inertia/pages/boats/rig_edit.vue` (PUT `/boats/:boatId/rig`)

### Equipment detail pages (onglets `info | photos`)

Chaque page charge ses photos via `mediaService.listForEntity(<entityType>, id)` et rend
`MediaPhotoGallery` dans l'onglet `photos` (`?tab=photos` synchronisé dans l'URL).

- engines: `inertia/pages/boats/engine_show.vue` (onglets `overview | specs | maintenance | notes | parts | photos | documents`)
- engine parts: `inertia/pages/boats/engine_part_show.vue` (`info | photos | documents`)
- sails: `inertia/pages/boats/sail_show.vue` (GET `/boats/:boatId/sails/:sailId`)
- rig: `inertia/pages/boats/rig_show.vue` (GET `/boats/:boatId/rig`, singleton)
- generic: `inertia/pages/boats/generic_equipment_show.vue` (GET `/boats/:boatId/generic-equipment/:itemId`)
- safety: `inertia/pages/boats/safety_equipment_show.vue` (GET `/boats/:boatId/safety-equipment/:itemId`)

Les cartes de l'onglet Équipement exposent un lien « voir le détail » vers ces pages.

### Engines (inventaire transverse, #598)

- `engines/index`: `inertia/pages/engines/index.vue` (GET `/engines`)
  - props: `engines` (paginé), `filters`, `boatOptions`, `summary`
  - backend: `EnginesController.index` → `EngineListService.listForUser`
  - sous-composants (`inertia/components/engines/list/`) : `EngineSummary` (4 tuiles de flotte),
    `EngineListToolbar` (recherche + filtres bateau/type/motorisation/statut + tri + bascule
    tableau/cartes), `EngineTable`, `EngineCards`
  - la navigation se fait en `router.get('/engines', …, { preserveScroll, preserveState, replace })`,
    les filtres vivent donc dans l'URL et sont partageables
  - `EngineTable` masque les colonnes motorisation / puissance / heures quand aucune ligne
    affichée ne les renseigne (même règle que `BoatTable`)
  - deux états vides distincts : flotte sans aucun moteur (CTA vers `/boats`) et recherche sans
    résultat (CTA « effacer les filtres »)
  - pastille de statut mutualisée avec la fiche bateau via `~/utils/engine_status`
  - entrée de nav `nav.engines` (section FLOTTE, icône `engine` de `NavIcon.vue`), gardée par
    `boats.view` comme `/boats`

### Ports (liste / création / édition)

Section réservée aux plans **Pro** et **Entreprise** (#604) : `RequirePortsPlanMiddleware` ferme
tout le groupe `/ports/*` au plan Starter (redirection `/settings/billing`), l'entrée « Ports » de
la nav est masquée via `effectiveQuotas.canManagePorts` ; la carte ports du dashboard l'est côté serveur (`DashboardLayoutService.availabilityFor`, même helper `canManagePortsFor`).

- `ports/index`: `inertia/pages/ports/index.vue` — GET `/ports`, `PortsController.index`
  - chaque carte affiche `ville, pays` via `locationLabel()` ; le pays passe par `countryName()`
    (#580) et s'affiche même sans ville
- `ports/new`: `inertia/pages/ports/new.vue` — form POST `/ports`, `PortsController.store`
- `ports/edit`: `inertia/pages/ports/edit.vue` — form PUT `/ports/:id`, `PortsController.update`
  - dans les deux formulaires, le **pays** est un `BaseSelect` ISO 3166-1 alimenté par
    `useCountries()` (#580). Il remplace le `<BaseInput maxlength="2">` qui bridait la saisie à
    2 caractères alors que le serveur en acceptait 8.
- `ports/show`: `inertia/pages/ports/show.vue` — GET `/ports/:id`, onglets `list | plan`,
  suppression via `router.delete('/ports/:id')`

### Budget

- Page: `inertia/pages/boats/budget.vue` (GET `/boats/:id/budget?year=`)
- Composants:
  - `inertia/components/boats/budget/BudgetBarChart.vue` — graphique mensuel par catégorie
  - `inertia/components/boats/budget/BudgetCategoryCard.vue` — carte totaux par catégorie
  - `inertia/components/boats/budget/BudgetPortStayForm.vue` — formulaire ajout séjour port
  - `inertia/components/boats/budget/BudgetPortStayList.vue` — liste séjours port avec suppression
  - `inertia/components/boats/budget/BudgetEntryForm.vue` — formulaire dépense libre (catégorie, montant, date)
  - `inertia/components/boats/budget/BudgetEntryList.vue` — liste dépenses libres avec badges catégorie
- En-tête : export CSV (`external-href`) et, si `canImport` (`canImportExpenses`, plan Pro ou Entreprise, + `import.run`), bouton « Importer des dépenses » → `<Link>` vers `/settings/import?type=expenses&boatId=:id`
- Props: `boat`, `budget`, `year`, `portStays`, `entries`, `canManage`, `canImport`, `portOptions`
- Types frontend: `inertia/types/budget.ts`
- Source backend: `BudgetController.show`

### Reporting (`/reports`, #887)

- Page : `inertia/pages/reports/index.vue` (GET `/reports?period=&from=&to=&boat=`), entrée « Reporting » de la section Business de la nav (`reports.view`, icône `chart`), quel que soit le plan.
- Composants `inertia/components/reports/` :
  - `ReportFilters.vue` — période (préréglage → rechargement immédiat ; « Personnalisée » → deux dates + « Appliquer »), bateau, export CSV (`external-href`, mêmes paramètres)
  - `ReportKpiGrid.vue` — `BaseStatCard` : coûts, revenus, marge, occupation, coût/jour loué (module Location), encaissé (module Facturation), coût/heure moteur, coût/mille, entretien prévu ; variation vs période précédente
  - `ReportCostChart.vue` (barres empilées par poste et par mois), `ReportRevenueCostChart.vue` (revenus vs coûts par bateau), `ReportOccupancyChart.vue` (ligne), `ReportTopCosts.vue` (postes triés), habillés par `ReportChartCard.vue`
  - `ReportBoatTable.vue` — une ligne par bateau (lien vers son budget) + total flotte, marge négative en `text-danger`
  - `ReportLockedPreview.vue` — Starter : silhouettes floutées, aucune donnée, `UpgradePlanModal` (`feature: 'reports'`)
- Couleurs des graphiques : `use_chart_palette.ts` lit les tokens CSS (`--color-amber-600`, `--color-success`…) et se recalcule quand `data-theme` bascule — aucune couleur en dur.
- Props : `ReportsPageProps` (`shared/types/reporting.ts`). Source : `ReportsController.index`.

### Équipage (`/crew`) et alertes de certifications (#882)

- Page : `inertia/pages/organization/crew.vue` (props `crewMembers: CrewMemberRow[]`, `canDelete`). À côté du nom, badge d'équipier `danger` « Certification expirée » ou `warning` « À renouveler » (`certificationStatus`, état le plus grave).
- `inertia/components/crew/CrewCertificationBadge.vue` — lit `status` (calculé côté serveur par `crewCertificationStatus`, fenêtre 60 jours) : « Expirée depuis N jours », « Expire dans N jours », « Valide » ; rien sans date.
- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` — options du select suffixées « certification expirée / à renouveler » (`CrewMemberOption.certificationStatus`), badge sur un membre embarqué au certificat expiré, avertissement `role="status"` : jamais bloquant.
- Widget du tableau de bord `inertia/components/dashboard/DashboardCrewCertificationsCard.vue` (`crew_certifications`, galerie, prop différée `crewCertifications`) : comptes, cinq lignes les plus urgentes, lien `/crew`.

### Diagnostic de panne (#515, #516, #576)

- Pages (GET `/diagnostic`, `/boats/:boatId/engines/:engineId/diagnostic[/sheets/:sheetSlug]`) :
  - `inertia/pages/diagnostic/index.vue` — moteurs éligibles de l'organisation ; la progression se
    lit sur `engine.totalSteps`, propre à la **famille** du moteur (#576), plus sur une constante
    globale — hors-bord et in-bord n'ont pas la même checklist
  - `inertia/pages/diagnostic/checklist.vue` — checklist globale résolue par la famille
    (`globalChecklistForFamily()`), titre, intro et avertissements portés par la checklist elle-même
  - `inertia/pages/diagnostic/sheet.vue` — fiche détaillée, `family` passée au contenu
  - `inertia/pages/diagnostic/first_contact.vue` — fiche autonome d'achat d'occasion (état local)
- Composants :
  - `diagnostic/DiagnosticSheetContent.vue` — sections **filtrées par famille**
    (`sectionsForFamily()`) : `electrical` est élargie aux in-bord sans être dupliquée, un hors-bord
    n'y voit pas les bougies de préchauffage ni un diesel le câblage de trim. Le rappel avant essai
    moteur suit aussi la famille (« jamais à sec » / « vanne de coque ouverte »)
  - `diagnostic/DiagnosticStepList.vue`, `DiagnosticProgress.vue`, `DiagnosticResetButton.vue`,
    `DiagnosticTable.vue`, `DiagnosticAiPanel.vue`
  - `engine/show/tabs/EngineShowTabDiagnostic.vue` — reçoit `family` et rend la checklist de cette
    famille ; le badge d'onglet de `boats/engine_show.vue` compte sur la même
- Contenu statique : `shared/constants/diagnostic/diagnostic_content.ts` (corpus hors-bord 2 temps)
  et `shared/constants/diagnostic/inboard_diesel_sheets.ts` (corpus in-bord) — clés i18n
  `diagnostic.*`, aucune règle d'éligibilité dupliquée dans un template
  (`isDiagnosticEligibleEngine()`, `#shared/helpers/diagnostic`)
- Source backend : `BoatEngineDiagnosticController`, `AiController.engineDiagnosis`
- Détail du domaine : `docs/domain/diagnostic.md`

### Pièces détachées (#517, #574, #575)

- Pages (GET `/spare-parts`, `/boats/:boatId/engines/:engineId/spare-parts[/assemblies/:assemblySlug]`):
  - `inertia/pages/spare_parts/index.vue` — parcours en 4 étapes + moteurs de l'organisation avec
    leur motorisation (ou « à préciser ») et la taille du panier
  - `inertia/pages/spare_parts/identify.vue` — étape 1 (identité moteur, plaque, avertissement n° de série), grille d'ensembles, pièces sans référence, liste de réparation
  - `inertia/pages/spare_parts/assembly.vue` — liens vues éclatées revendeurs, carte de décodage de référence (motif de la marque, #575), pièces courantes (nom FR + intitulé catalogue EN, référence sourcée quand elle est connue), liste de réparation
- Composants `inertia/components/spare_parts/`:
  - `SparePartsIdentitySection.vue` — carte identité moteur + aides plaque **servies par le backend**
    (`engine_brands.plate_location_key`, #575) : le composant ne filtre plus rien lui-même. La mise
    en garde « numéro de série » se précise quand le code plaque couvre plusieurs modèles
  - `SparePartsAssemblyGrid.vue` — ensembles fonctionnels **filtrés par la famille de motorisation**
    du moteur (`assembliesForEngine()`, #574) : 21 au catalogue, jamais une grille vide — une
    famille inconnue retombe sur les ensembles génériques
  - `SparePartsPartList.vue` / `SparePartsUnreferencedList.vue` — fiches pièces avec ajout au panier
  - `SparePartsReferenceSource.vue` — référence constructeur **toujours accompagnée de sa source**
    (#575), seul composant qui en affiche une : une entrée jamais revérifiée le dit explicitement
  - `SparePartsRetailerLinks.vue` — ancres externes `target="_blank"` vers Partzilla / Boats.net / Crowley Marine (eslint-disable motivé)
  - `SparePartsCartPanel.vue` — quantités, référence (pré-remplie depuis le catalogue quand elle est
    connue, toujours modifiable), source créditée tant que la ligne porte la référence du catalogue,
    suppression, export CSV (`external-href`)
- Chat IA de recherche de références (#634, GET `/boats/:boatId/engines/:engineId/spare-parts/chat`) :
  - `inertia/pages/spare_parts/chat.vue` — page dédiée par moteur, conversation persistée
  - `inertia/components/spare_parts/chat/` : `SparePartsAiEntryCard.vue` (carte navy d'entrée sur
    l'index — sélecteur de moteur — et la page d'identification ; plan sans IA → `UpgradePlanModal`),
    `SparePartsChatPanel.vue` (bulle optimiste pendant l'appel Mistral synchrone, encart statique
    d'échec d'identification), `SparePartsChatMessage.vue` (libellés vouvoyés `parts.ai.*` — ceux du
    chat public tutoient), `SparePartsChatComposer.vue`, `SparePartsChatResultCard.vue` (référence
    via `SparePartsReferenceSource`, ajout au panier, replis revendeurs / identification manuelle)
- Contenu statique: `shared/constants/spare_parts/spare_parts_content.ts` (9 ensembles hors-bord) et
  `shared/constants/spare_parts/inboard_assemblies.ts` (12 ensembles in-bord, embases, groupe
  électrogène) — clés i18n `parts.*`, intitulés catalogue EN littéraux
- Liens croisés: fiche de diagnostic → ensemble (`diagnostic/sheet.vue`), onglet Pièces moteur → CTA
  « Identifier une pièce » conditionné par `isSparePartsEligibleEngine()` (jamais une règle dupliquée
  dans un template), sidebar `nav.spareParts`
- Source backend: `BoatEngineSparePartsController`

### Onglets scrollables (#495)

`BaseTabs.vue` est scrollable horizontalement avec `snap-x`/`snap-start`, et affiche des
**dégradés de bord** (`[data-overflow="left|right"]`) quand des onglets dépassent — mis à jour au
scroll et au redimensionnement (ResizeObserver). Toute page à onglets en bénéficie.

L'écran d'inspection (`boats/reservation_inspection.vue`) bascule ses panneaux Départ/Retour en
onglets `BaseTabs` **sous `lg`** (comparer sans défilement interminable) et garde les deux colonnes
au-dessus. Chaque panneau n'est rendu qu'une fois (ids de formulaires uniques) — seule sa
visibilité change (`hidden lg:block` sur le panneau inactif).

### Checklist d'état des lieux (#584)

Chaque panneau d'inspection embarque `InspectionChecklist.vue` (sections + progression) et
`InspectionChecklistItem.vue` (ligne : tap = `ok`, note obligatoire sur `remark`/`damage`, cibles
tactiles ≥ 44 px). Le contenu vient du corpus statique
`shared/constants/inspections/inspection_checklist_content.ts`, filtré par la catégorie du bateau
(`inspectionSectionsForCategory`, prop `boat.category` calculée côté serveur avec repli legacy) —
seul l'état persisté (`items`) transite par Inertia, comme les checklists de diagnostic. Sur le
panneau Retour, chaque point affiche son état au Départ et signale une dégradation en rouge. Un
point en `damage` ouvre `InspectionDefectModal` **pré-remplie** (prop `prefill` : libellé du point +
note du constat). Mutations via `router.patch`/`router.delete` + `preserveScroll` sur
`.../inspections/:inspectionId/items`. Voir `docs/domain/inspections.md`.

### État des lieux signé (#889)

En tête de chaque panneau d'inspection existante, `InspectionDocumentBar.vue` affiche le statut
(brouillon, ou « Signé le … » avec les signataires et la date d'envoi) et trois gestes : **PDF**
(ancre `target="_blank"`, `?inline=1`), **Faire signer** (ouvre `InspectionSignModal.vue`) tant que
l'inspection n'est pas signée, **Envoyer / Renvoyer au client** (`router.post` + `preserveScroll`)
une fois signée. La modale réunit le nom du client et deux `SignaturePad.vue` (canvas, pointer
events, PNG dans le modèle) ; « Signer et figer » reste désactivé tant qu'il manque un tracé ou le
réseau. Le pad reste clair dans les deux thèmes (`bg-navy-25`, qui ne s'inverse pas) : il figure le
papier du PDF, encre `SIGNATURE_INK_COLOR`. Signée, l'inspection masque formulaire, saisie de
checklist, ajout/suppression de photos et de défauts, et le bouton Supprimer (`locked` dans
`InspectionPanel.vue`).

### Liens et navigation (#533)

- **Navigation interne = `<Link>` (`@adonisjs/inertia/vue`)**, jamais `<a href="/…">` : une ancre brute recharge l'app entière. Deux règles ESLint le tiennent (`vue/no-restricted-static-attribute`, `vue/no-restricted-v-bind` sur `inertia/**/*.vue`).
- **`BaseButton` applique la règle tout seul** : `href` interne → `<Link>`, `href` absolu (`https:`/`mailto:`/`tel:`) → ancre. La prop **`external-href`** force l'ancre sur un chemin interne — à réserver aux téléchargements et exports (`ContractPanel`, export CSV de `boats/budget.vue`), qu'une visite Inertia rendrait comme une page.
- **`<Link target="_blank">` n'ouvre pas de nouvel onglet** : `shouldIntercept()` d'Inertia ne regarde que les touches de modification et le bouton de la souris, jamais `target`. Un vrai nouvel onglet demande une ancre `<a target="_blank" rel="noopener">` — c'est le cas des liens CGU/confidentialité de `SignupTermsCheckbox` et du consentement de `ContactFormSection`, qui protègent un formulaire à moitié rempli.
- **Les 14 ancres restantes** (téléchargements, `mailto:`/`tel:`, URL externes des mentions légales) portent chacune un `eslint-disable` qui en donne la raison — c'est là qu'il faut regarder avant d'en ajouter une.
- **Côté tests** : `tests/inertia/setup.ts` mocke `Link` globalement (le vrai composant exige un `TuyauProvider`). Un test qui pose son propre `vi.mock('@adonisjs/inertia/vue', …)` remplace ce mock **entièrement** et doit donc réexporter `Link`.

### Marketing (pages publiques)

- Pages : `inertia/pages/marketing/{home,pricing,about,contact,guide,simulator,simulator_share,privacy,terms,sales_terms,legal_notice,diagnosis_ai,parts_ai,feature,help}.vue` — rendues par `MarketingController` (routes locale-préfixées `/en`, `/fr`, voir `start/routes/marketing.ts`), layout `inertia/layouts/public.vue` ; `diagnosis_ai.vue` est rendue par `PublicDiagnosisController` (#602), `parts_ai.vue` par `PublicPartSearchController` (#634 Phase 2) et `feature.vue` par `MarketingFeaturesController` (refonte 2026-09)
- Pages fonctionnalité (refonte marketing 2026-09) : `feature.vue` est une page générique rendue pour trois routes — carnet d'entretien (`/fr/carnet-entretien-bateau` • `/en/boat-maintenance-log`), gestion de flotte (`/fr/gestion-flotte-bateaux` • `/en/boat-fleet-management`) et assistant IA (`/fr/assistant-ia-bateau` • `/en/ai-boat-assistant`). `MarketingFeaturesController.buildFeaturePageData` lit les clés plates `marketing.features.<feature>.*` ; sections dans `components/marketing/features/` (`FeatureHeroSection`, `FeatureStepsSection`, `FeatureProofSection`, `FeatureCrossLinksSection`, `FeatureFinalCtaSection`) + réutilisation de `home/HomeFeatureSection.vue` (blocs bénéfices, prop `cta` optionnelle) et `guide/GuideFaqSection.vue`
- Page Aide & support (`/fr/aide` • `/en/help`) : `help.vue`, `MarketingController.help` — cartes canaux (`help/HelpChannelsSection.vue`, `mailto:` support en ancre motivée), FAQ groupée réutilisant des clés `homeFaq`/`pricingFaq` (`HelpFaqGroupsSection.vue`) et ressources gratuites (`HelpResourcesSection.vue`)
- Nav publique (refonte 2026-09) : `use_public_nav.ts` est la **source unique** des liens du header et du drawer — dropdown « Produit » (`AppHeaderProductMenu.vue`, uniquement les 3 pages fonctionnalité), puis les **outils gratuits en liens directs** (simulateur, diagnostic IA, pièces IA — tunnels d'acquisition, jamais dans le dropdown), puis Tarifs / Guide / Aide. La nav complète (7 items) n'apparaît qu'à partir de `lg` (débordement en 768 px) : hamburger + drawer couvrent mobile **et** tablette, paddings resserrés entre `lg` et `xl`. Footer 5 colonnes avec colonne « Ressources » (`layouts/public.vue`)
- Home resserrée à 10 sections (refonte 2026-09) : hero → problème → **diagnostic** (remonté en 3ᵉ position, promotion SEO 2026-09-21) → 3 features (avec CTA vers les pages fonctionnalité) → étapes → témoignages → FAQ → CTA final. Le hero porte un badge `<Link>` optionnel (`announcement`, servi par `homePage()`) vers le chat public de diagnostic, et le `<Head>` rend trois JSON-LD SSR (`WebSite`, `FAQPage`, `SoftwareApplication`) avec canonical/hreflang absolus (`marketingUrl`). **Huit sections sont retirées de l'affichage mais conservées** (`HomePillarsSection`, `HomeModularOfferSection`, `HomeCaseStudySection`, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeSecuritySection`, `HomeDemoSection`) : imports et blocs template commentés dans `home.vue`, chaque composant porte un commentaire d'en-tête expliquant son rôle et son statut — **ne pas les supprimer**, `buildHomePageData` construit toujours leurs props pour une réactivation par simple décommentage
- Slugs localisés (#475) : `MARKETING_SLUGS` (`shared/helpers/locale_path.ts`) est la **source de vérité unique** du slug de chaque page marketing dans les deux locales, aligné sur `start/routes/marketing.ts`. Un lien, un `canonical`/`hreflang` ou une entrée de sitemap ne s'écrit **jamais** en interpolant la locale (`/${locale}/tarifs`) ni en ternaire (`locale === 'fr' ? … : …`) : on passe par `marketingPath(page, locale)`. En dépendent `AppHeader.vue`, `AppHeaderMobileDrawer.vue`, le footer de `layouts/public.vue`, `home/{HomeFaqCtaSection,HomeDemoSection}.vue`, le `ctaHref` de la section diagnostic (`MarketingController`), le `ctaHref` de l'offre modulaire (`MarketingController`), les `<Head>` des dix pages marketing et le générateur de `sitemap.xml` (`start/routes/home.ts`). Le sélecteur de langue dérive du même table (`LOCALIZED_PATH_ALIASES`), ce qui lui évite le 404 qu'il produisait sur simulateur, guide, confidentialité, CGU, CGV et mentions légales — dont les slugs diffèrent d'une locale à l'autre
- Page tarifs (#475) : `/en/pricing` en anglais, `/fr/tarifs` en français ; `/en/tarifs` ne subsiste que comme redirection 301 (`marketing.en.pricing_legacy`)
- Pages légales : `privacy.vue` (`/fr/confidentialite`, `/en/privacy`), `terms.vue` (`/fr/cgu`, `/en/terms`, #455), `sales_terms.vue` (`/fr/cgv`, `/en/sales-terms`, #466) et `legal_notice.vue` (`/fr/mentions-legales`, `/en/legal-notice`, #466) ne portent que leur `<Head>` et délèguent le rendu à `components/marketing/legal/LegalDocumentSections.vue` (hero + sections numérotées + bloc contact, plus une fiche « libellé : valeur » via `LegalSection.entries`), alimenté par le type `LegalDocument` de `shared/types/marketing.ts`. Les quatre sont liées depuis la colonne « Légal » du footer public (et les CGU depuis la case du signup), et référencées au sitemap avec leurs alternates hreflang. L'identité affichée par les mentions légales vient des variables `LEGAL_*` (`config/legal.ts`), pas de l'i18n — voir `docs/dev/mentions-legales.md`. La section « Durée de conservation » de `privacy.vue` énumère depuis #775 les durées réellement appliquées par les crons de purge (`shared/constants/data_retention.ts`) : les clés `privacy.s6_b1` à `s6_b4` et le code se modifient ensemble, sinon la page promet ce que personne n'exécute
- i18n : textes construits côté serveur depuis `resources/lang/{en,fr}/marketing.json` et passés en prop `t` (namespace exclu de `appT`)
- Composants par page dans `inertia/components/marketing/{home,pricing,about,contact,simulator,guide,diagnosis,parts_ai}/`
- JSON-LD (SEO 2026-09-21) : toujours une balise native `<component :is="'script'" type="application/ld+json">{{ jsonLd(schema) }}</component>` **directement** dans `<Head>` (helper `inertia/utils/json_ld.ts`) — `<Head>` ignore tout composant, l'ancien `components/json_ld` ne rendait rien
- Page diagnostic IA (`diagnosis_ai.vue`, SEO 2026-09-21) : sous le chat (`#diagnosis-chat`, cible du CTA hero), des sections indexables servies par la prop `content` (`PublicDiagnosisContentService`) — `FeatureStepsSection`, `diagnosis/DiagnosisSymptomsSection.vue` (huit pannes fréquentes, cartes `h3` ancrées sur le chat), `FeatureCrossLinksSection`, `GuideFaqSection`, `FeatureFinalCtaSection` ; `<Head>` avec JSON-LD `FAQPage` + `BreadcrumbList` + `WebApplication`, `og:locale`, URLs absolues
- Page pièces IA (`parts_ai.vue`, SEO 2026-09-22) : même gabarit que la page diagnostic — chat ancré `#parts-chat`, prop `content` (`PublicPartSearchContentService`), `FeatureStepsSection`, `parts_ai/PartsAiPartsSection.vue` (huit pièces fréquentes), `FeatureCrossLinksSection`, `GuideFaqSection`, `FeatureFinalCtaSection` ; `<Head>` avec JSON-LD `FAQPage` + `BreadcrumbList` + `WebApplication`, `og:locale`, URLs absolues
- Chat diagnostic IA public (#602) : `diagnosis_ai.vue` (page hybride anonyme/connecté, namespace `publicDiagnosis` au tutoiement, transmis par `appT` contrairement à `marketing`) orchestre `diagnosis/DiagnosisChatPanel.vue` (mutations `router.post` + `preserveScroll` + partial reload `only: ['conversation', 'quota', …]`, message optimiste local pendant l'appel Mistral synchrone), avec `DiagnosisChatMessage`, `DiagnosisChatComposer` (contexte moteur au 1er message), `DiagnosisResultCard` et `DiagnosisQuotaBanner` (2 conversations gratuites, CTA `/signup?from=diagnostic`)
- Chat public de recherche de pièces (#634 Phase 2) : `parts_ai.vue` (page hybride, namespace `publicPartSearch` au tutoiement, transmis par `appT`) orchestre `parts_ai/PartsAiChatPanel.vue` (mêmes conventions que le diagnostic : `router.post` + `preserveScroll` + `only: ['conversation', 'quota', …]`, bulle optimiste, encart statique d'échec d'identification), avec `PartsAiChatMessage`, `PartsAiChatComposer` (marque + numéro de série au 1er message), `PartsAiQuotaBanner` (2 recherches gratuites, CTA `/signup?from=parts`) et `PartsAiResultCard` — la référence sort par `SparePartsReferenceSource` (prop `i18nPrefix`) et le repli par `SparePartsRetailerLinks` (prop `keys`), les deux composants partagés acceptant des libellés publics pour ne pas mélanger tu/vous. Lien de nav « Pièces IA » (header, drawer, footer, `public.nav/footer.partsAi`)
- Mise en avant du diagnostic IA (#609) : le chat public est exposé par un lien de nav direct « Diagnostic IA » (via `use_public_nav.ts`, `public.nav.diagnosisAi`, href via `marketingPath('diagnosisAi', locale)`), par `home/HomeDiagnosisSection.vue` (promesse + les trois étapes du diagnostic, CTA vers le **chat public** et non `/signup` : l'entrée sans friction du tunnel) et par l'argumentaire tarifs (ligne du tiers Starter, ligne « Diagnostic de panne public » du comparatif, FAQ « essayer l'IA sans compte »). Les quotas affichés interpolent `PUBLIC_DIAGNOSIS_LIFETIME_LIMIT` dans `MarketingController`, jamais un nombre recopié dans le JSON de traduction (#454)
- Simulateur (#464) : les champs numériques de la première étape vivent dans `simulator/SimulatorBoatDimensionsFields.vue` — ils conservent la saisie **texte** et n'émettent qu'une valeur parsée (`parseDecimalInput` de `shared/helpers/number_format.ts`, qui lit le point comme la virgule), jamais un `Number()` réinjecté dans le champ. Les longueurs affichées passent par `formatLength` (`useNumberFormat()` côté composant, le helper partagé avec locale explicite pour le titre Open Graph de `simulator_share.vue`) : `10,5 m` en FR, `10.5 m` en EN, jamais `{length}m` collé. Le namespace `simulator` est au **tutoiement** comme le reste du marketing
- Prix et compteurs (#465) : un prix affiché passe par `formatPrice` (`useNumberFormat()`, helper partagé `shared/helpers/number_format.ts`) — jamais `{{ price }} €` collé dans le template, sinon la page EN annonce « 20 € » à côté d'un texte disant « €20 ». Concerne `home/HomeModularOfferSection.vue`, `pricing/{PricingModulesSection,PricingConfigurator,PricingConfiguratorModuleCard,PricingDetailedTableSection,PricingROISection}.vue`. Les chiffres animés (`HomeStatValue.vue` → `use_count_up.ts`) regroupent leurs milliers via `Intl.NumberFormat` sur la locale de l'app (`28 240` en FR, `28,240` en EN) et lisent la virgule française comme un séparateur **décimal**
- Mockups d'écran de la home (`home/HomeMock{Dashboard,BoatDetail,Planning,Fleetide,UpcomingTasks}.vue`) : faux screenshots au texte français écrit en dur — ils ne passent pas par `t()` et échappent donc aux relectures i18n, penser à les inclure dans toute passe d'orthographe
- Formulaire de contact (#450) : `contact/ContactFormSection.vue` poste sur `POST /contact` via `useForm` (`preserveScroll`), erreurs VineJS affichées par champ, panneau de confirmation piloté par la prop `contactSent` (flash relu par `MarketingController.contact`) puis par l'état local après `onSuccess`. Barre latérale extraite en `ContactFormSidebar.vue`, pastilles sujet/taille de flotte en `ContactPillGroup.vue`. Les cartes de `ContactChannelsSection.vue` sont des liens : ancre `#contact-form`, `<Link>` `/signup`, `mailto:` support et presse.
- Canvas décoratifs (`inertia/components/marketing/canvas/`, tous `aria-hidden`, cycle de vie via `use_canvas_lifecycle.ts`) :
  - `GradientMeshCanvas.vue` — dégradé WebGL (repli 2D) : heros home (`navy`), tarifs (`sunset`), about (`dawn`)
  - `PortsMapCanvas.vue` — carte pointillée + arcs : `HomeStatsBandSection` (`dark`, bande navy), hero contact (`light`)
  - `ParticleNetworkCanvas.vue` — particules réactives souris : `HomeFinalCtaSection`
- Détail des animations : `inertia/css/ANIMATIONS.md`

### Factures — fiche d'un document (`/invoices/:id`, #717)

- Page : `inertia/pages/invoices/show.vue` (props `invoice`, `canDelete`, `readOnly`), sous-composants `InvoiceStatusBadge`, `InvoiceLinesCard`, `InvoicePaymentCard`.
- **Facture émise = fiche en lecture** : dès qu'une facture (`kind: 'invoice'`) quitte le brouillon, le bouton « Modifier » disparaît de la fiche **et** de la liste (`canEditInvoice`, `shared/helpers/invoice_lifecycle.ts`), remplacé par une ligne d'explication (`invoices.lockedNotice`). Les devis et les factures brouillon gardent le bouton.
- `InvoiceOnlinePaymentCard.vue` (#876) — visible sur une facture payable en ligne (`isInvoicePayableOnline`) quand un lien existe ou que l'organisation encaisse en ligne (prop de page `canAcceptOnlinePayments`) : champ en lecture seule avec l'URL `/pay/:token` + « Copier le lien », ou bouton « Créer le lien de paiement » (`router.post('/invoices/:id/payment-link')`).
- `InvoicePaymentCard.vue` — visible sur une facture émise non annulée : date de paiement (`<input type="date">`, format machine) + moyen de paiement (`cash`/`card`/`transfer`/`check`/`other`, désactivé tant qu'aucune date n'est posée). Soumission par visite Inertia `router.patch('/invoices/:id/payment', …, { preserveScroll: true })` — jamais de `fetch` + CSRF manuel. Vider la date annule le paiement enregistré. Sur un avoir (#877), le même bloc saisit le **remboursement** (libellés `invoices.creditNote.refund.*`) ; il disparaît d'une facture entièrement avoirée.
- `InvoiceDetailsCard.vue` — bloc « Détails » (dates, paiement ou remboursement, client, réservation), extrait de la page.
- `InvoiceCreditNotesCard.vue` (#877) — sur une facture émise : avoirs déjà émis (lien, date, badge, montant), total avoirs et reste à régler, bouton « Émettre un avoir » (`<Link>` vers `/invoices/:id/credit-note`, masqué en lecture seule et sur une facture `credited`). Sur la fiche d'un avoir : lien « Avoir sur la facture … » dans l'en-tête, pas de bouton Supprimer (ni sur une facture qui porte des avoirs). `InvoiceStatusBadge` prend un `kind` optionnel : sur un avoir, `sent`/`paid` se lisent « Émis »/« Remboursé ».
- `InvoiceRemindersCard.vue` (#878, prop de page `reminders: InvoiceRemindersInfo | null`, facture émise) — nombre et date de la dernière relance, rappel « relances automatiques activées / désactivées », historique (palier, automatique ou manuelle, auteur, motif d'une relance non envoyée en `text-warning`), bouton « Relancer maintenant » (`router.post('/invoices/:id/reminders')`, facture `overdue` seulement, `canRemindInvoice`) et interrupteur « Ne plus relancer » (`router.patch('/invoices/:id/reminders', { disabled })`, facture non réglée). Rien d'actionnable en lecture seule. La liste `/invoices` affiche un badge « Relancée ×N » (`reminderCount`).

### Factures — émission d'un avoir (`/invoices/:id/credit-note`, #877)

- Page : `inertia/pages/invoices/credit_note.vue` (prop `invoice: InvoiceDetail`). Motif (`BaseTextarea`, obligatoire), `InvoiceLinesEditor` pré-rempli avec les lignes de la facture tant qu'aucun avoir n'existe (sinon une ligne vide), `InvoiceTotalsPreview` au taux de TVA de la facture, rappel « déjà crédité » / « encore créditable ». Un montant au-dessus du reste affiche une alerte et désactive l'envoi. Soumission `router.post('/invoices/:id/credit-notes')` ; le serveur redirige vers la fiche de l'avoir. Le filtre de type de `/invoices` propose « Avoir », celui de statut « Annulée par avoir ».
- Le détail affiche « Payé le » et « Moyen de paiement » uniquement quand un paiement est enregistré — l'invariant `paid_at ⇔ status paid` (#717) garantit qu'aucun brouillon n'affiche de date de règlement.

### Settings — notifications (`/settings/notifications`, #498)

- Page : `inertia/pages/settings/notifications.vue` → `components/settings/tabs/SettingsNotificationsTab.vue` (prop `pushSubscriptions`, servie par `SettingsController.notifications`), section visible pour **tous les rôles**.
- Gestion du Web Push : activer/désactiver **cet appareil** (`use_push_notifications.ts` — `subscribe()` uniquement sur geste utilisateur), liste des appareils abonnés (`user_agent`, dates) et retrait par appareil (`DELETE /push/subscriptions/:id`). Sur iOS hors PWA installée, `IosInstallHint.vue` remplace le bouton. Détail : `docs/frontend/pwa.md` § Web Push.

### Settings — organisation (`/settings/org`, #761)

- Page : `inertia/pages/settings/org.vue` → `components/settings/tabs/SettingsOrgTab.vue` (prop `organization` — `id` et `name` seulement, servie par `SettingsController.org`).
- **Un écran, deux audiences** : **ouvrir** la page est `members.view` (admin + member, comme `/settings/members` — `SettingsShell` conditionne les deux onglets à cette même capability), **renommer** est `organization.manage` (admin seul, #761). Le formulaire n'est rendu que sous `can('organization.manage')` ; sinon le nom s'affiche en lecture seule (`BaseInput` `disabled`) avec `settings.org.readOnlyHint`. Sans cette distinction, un member gardait un formulaire que `PUT /settings/org` refuse.
- Les deux gardes sont côté backend, pas seulement dans le rendu : `authorize('viewMembers')` sur le `GET`, `authorize('manageOrganization')` sur le `PUT` — un mechanic ou un boat_owner qui tape l'URL reçoit la page 403.
- Le logo de l'organisation ne vit **pas** ici mais sur `/settings/branding` (`branding.configure`), avec le reste de la marque.

### Paiement public d'une facture (`/pay/:token`, #876)

- Page : `inertia/pages/pay/show.vue` (layout `auth`, sans login), prop `payment: PublicInvoicePayment | null`. Carte émetteur, numéro, client, dates, montant ; bouton « Payer {montant} » (`useForm().post('/pay/:token/checkout')` → Stripe Checkout) si `state === 'payable'`, sinon alerte « réglée », « paiement en cours de confirmation » (retour `?status=success`) ou « indisponible ». `payment === null` : carte « lien invalide ».

### Réservation en ligne (`/book/:orgSlug`, `/book/:orgSlug/:boatSlug`, #881)

- Layout `inertia/layouts/booking.vue` (sans login) : en-tête au nom de l'organisation (logo de la marque blanche en Entreprise, prop `organization`), pied « propulsé par FleetAi », toasts flash. `noindex` (`<meta name="robots">` + `X-Robots-Tag`).
- `pages/book/fleet.vue` : grille de `PublicBoatCard.vue` (photo, `PublicBoatSpecs.vue`, « à partir de »), état vide.
- `pages/book/show.vue` : `PublicBoatGallery.vue`, caractéristiques, carte tarifs ; colonne de droite : `PublicBookingCalendar.vue` (grille mensuelle `useMonthNav`, jours occupés grisés et non cliquables, arrivée puis départ via `canPickDay`/`nextDraft` de `shared/helpers/public_booking.ts`), `PublicBookingQuotePanel.vue` (devis serveur, acompte 30 %, caution) et `PublicBookingRequestForm.vue` (`useForm().post('…/request')`, champ piège `website` hors écran, consentement). Chaque sélection complète recharge la seule prop `quote` : `router.get(url, { startsOn, endsOn }, { only: ['quote'], preserveState: true, replace: true })`. Après l'envoi, prop `submitted` → alerte de succès.
- Côté app : encart `components/reservations/public_booking/BoatPublicBookingCard.vue` sur `boats/reservations.vue` (bascule `BaseToggle` → `router.patch('/boats/:id/public-booking')`, lien à copier, lien « Voir la page » en nouvel onglet) ; badge `ReservationSourceBadge.vue` (« Demande en ligne ») dans `ReservationList.vue` et `FleetReservationList.vue`.
- Tests : `tests/inertia/public_booking_calendar.spec.ts`, `public_booking_request_form.spec.ts`, `boat_public_booking_card.spec.ts` ; fonctionnel `tests/functional/reservations/public_booking.spec.ts`.

### Settings — facturation (`/settings/billing`)

- Page : `inertia/pages/settings/billing.vue` → `components/settings/tabs/SettingsBillingTab.vue` (props `plan`, `quotaUsage`, `subscription`, `orgModules`, `orgAddons`, servies par `SettingsController.billing`)
- Page consultable par tous les rôles ; les boutons portail Stripe / checkout du pied de carte, comme les CTA des sous-composants, ne s'affichent que pour un porteur de `subscription.manage` (#843) — sinon le message `settings.billing.subscription.adminOnly`
- Sous-composants (le tab reste sous la limite de 250 lignes) :
  - `SettingsBillingUsageGauge.vue` — jauges bateaux / membres / stockage / tokens IA
  - `SettingsBillingFeatureList.vue` — capacités du plan. Deux lignes IA distinctes (#456) : « IA / Copilote » (depuis `quotaUsage.canUseAI`) et « Personnalisation IA (prompt métier) » (depuis `PLAN_LIMITS[plan].canCustomizeAI`, qu'aucun module add-on n'accorde). En Pro la première est cochée et la seconde non — les fusionner laissait croire que `/settings/ai` était accessible
  - `SettingsBillingSubscriptionNotice.vue` — bandeau affiché quand `plan === 'pro' && subscription === null` (#456). L'organisation **a** le plan Pro en base mais aucun abonnement Stripe actif ; le bandeau nomme le plan possédé et explique que modules et add-ons sont facturés sur l'abonnement. CTA « Finaliser l'abonnement » (→ `startCheckout('pro')`) pour un porteur de `subscription.manage`, renvoi vers un administrateur sinon
  - `SettingsBillingModules.vue` — modules add-ons (`charter`, `crm_invoicing`)
  - `SettingsOnlinePayments.vue` (#876, rendu par la page sous le tab, prop `onlinePayments`) — compte Stripe connecté : badge d'état (`none`/`pending`/`active`), « Connecter mon compte Stripe » / « Terminer la configuration » (`useForm().post('/settings/billing/online-payments')` → redirection Stripe) et « Déconnecter » (`router.delete`, après confirmation) pour un porteur de `subscription.manage` ; message « module requis » si `available` est faux
  - `SettingsInvoiceReminders.vue` (#878, rendu par la page sous le tab, prop `invoiceReminders`) — relances automatiques des factures en retard : badge activées/désactivées, interrupteur, message ajouté à chaque relance et mention des pénalités (`BaseTextarea`, 1 000 caractères), `useForm().patch('/settings/billing/invoice-reminders')`. Formulaire réservé à `subscription.manage` ; message « module requis » si `available` est faux
  - `SettingsAccounting.vue` (#879, rendu par la page sous le tab, prop `accounting: AccountingSettings`) — export comptable : SIREN et comptes du FEC (ventes, TVA collectée, clients, banque ; défauts 706/44571/411/512), rappel « aide au comptable, pas un livre certifié », `useForm().put('/settings/billing/accounting')`. Formulaire réservé à `subscription.manage`, lecture seule sinon
  - `SettingsBillingExtraBoats.vue` — add-on quantitatif `extra_boats` (stepper). Même distinction plan/abonnement que les modules : la branche « Pro sans abonnement actif » propose de finaliser l'abonnement, la branche Starter affiche « Disponible à partir du plan Pro »
- **Plan ≠ abonnement** : `plan` est une colonne de `organizations`, `subscription` l'abonnement Stripe actif. Tout libellé qui les confond finit par nier au client un plan qu'il possède — c'est le bug #456. Les libellés « Nécessite un plan Pro actif » sont réservés au vrai Starter.
- Écrans gatés (`/invoices`, `/pricing/seasons`, `/clients`, `/settings/ai`, `/settings/branding`, `/settings/import`) : la redirection d'upsell vise `/settings/billing` (`BILLING_SETTINGS_PATH`) et **jamais** `/`, qui redirige sur `/en` — le layout public ne rend aucun toast, le flash y serait perdu (#456).

### Exports flotte et comptables (#879)

- Dialogue générique `inertia/components/exports/ExportDialog.vue` : bouton « Exporter » → `BaseModal` avec période (du/au, `<input type="date">`), un slot pour les filtres, rappel du seuil d'arrière-plan (`EXPORT_ASYNC_THRESHOLD`) et bouton « Télécharger » (`BaseButton` `external-href` — un fichier, pas une visite Inertia ; au-delà du seuil, le serveur revient sur l'écran avec un flash). Affiché si le plan exporte (`useCanExport()`, `inertia/composables/use_can_export.ts`).
- `/invoices` : `InvoicesExportDialog.vue` — journal des ventes (période, type facture/avoir, statut, détail par pièce ou par ligne) et section FEC (exercice, année courante et les 5 précédentes).
- `/reservations` : `ReservationsExportDialog.vue` (bateau, statut, statut de paiement) ; `/clients` : `ClientsExportDialog.vue` (période sur la création, clients anonymisés exclus).
- `/maintenance/history` : bouton « Exporter CSV » à côté du PDF, avec les filtres de l'écran.
- `/settings/exports` (`inertia/pages/settings/exports.vue` → `components/settings/tabs/SettingsExportsTab.vue`, props `exports: DataExportRow[]`, `threshold`, `retentionDays`, servies par `DataExportsController.index`) : exports générés en arrière-plan **du demandeur** — type, période (`useDateFormat`), statut (`pending`/`ready`/`failed`), lignes, dates de création et d'expiration, bouton « Télécharger » vers le lien signé. Entrée « Exports » de `SettingsShell` conditionnée à `canExport`. La notification `export.ready` y mène.

### Settings — import / export CSV (`/settings/import`)

- Page : `inertia/pages/settings/import.vue` → `components/settings/tabs/SettingsImportTab.vue` (props `boats`, `preview`, `hasPendingImport`, `canImport`, `importTypes`, `initialType`, `initialBoatId`, servies par `CsvImportController.show`), qui compose `components/settings/import/ImportExportCard.vue` (liens export) — avec une période du/au (#879) ajoutée aux quatre liens, `ImportUploadForm.vue` (bateau, type, fichier `.csv,.xlsx`) et `ImportPreviewPanel.vue` (table d'aperçu dont les colonnes suivent `preview.type`, trois statuts : `valid` mint, `invalid` coral, `duplicate` amber « Déjà présente »).
- **Deux types d'import** : `maintenance` et `expenses` (dépenses du budget, `boat_budget_entries`). `CsvHelpModal` prend le `type` courant et affiche le format attendu correspondant (alias d'en-têtes FR/EN, formats de date et de montant, catégories, règle des doublons).
- **Présélection** : `?type=expenses&boatId=N` — c'est le lien du bouton « Importer des dépenses » de la page budget (`routes.csv.importExpenses`).
- **Un écran, deux fonctions aux droits différents** (#715). Les **exports** (maintenance, avitaillements, journal de bord) suivent `canExport` : plan Pro ou Entreprise, tous rôles. L'**import** exige la capability `import.run` (admin seul) **et** un plan qui ouvre le type : les dépenses dès Pro (`canImportExpenses`), l'historique d'entretien en Entreprise (`canImport`) — table `CSV_IMPORT_PLAN_FLAGS`. La prop `importTypes` liste les types ouverts (plan et rôle), `canImport` vaut « au moins un » : c'est elle qui rend la section d'import, sinon le bloc affiche `settings.import.restricted` et le formulaire disparaît, exports compris intacts. Le sélecteur de type (`ImportUploadForm`, prop `types`) ne propose que `importTypes` ; chaque type fermé est signalé sous le formulaire par `settings.import.typeRestricted.<type>` (un admin Pro voit « l'historique d'entretien est réservé au plan Entreprise »). Une présélection `?type=` sur un type fermé est ignorée par le contrôleur.
- La page ne redirige vers `/settings/billing` que si **ni** l'import **ni** l'export n'est accordé (plan Starter) — personne n'atteint un écran vide. L'entrée de nav « Import / Export » de `SettingsShell` reste, elle, conditionnée à `canExport`.
- **`hasPendingImport` vient de la table `pending_imports`**, plus de la session (#774) : les lignes à confirmer y vivent désormais, et seul `pendingImportId` reste en session. Un `confirm` joué dans un autre onglet laissait sinon l'écran proposer de confirmer un import déjà consommé.
- **Les bornes affichées viennent du code** : `settings.import.fileHint` et `settings.import.help.step2` interpolent `CSV_IMPORT_MAX_FILE_SIZE_MB` et `CSV_IMPORT_MAX_ROWS` (`shared/constants/csv_import.ts`). L'aide annonçait « max 5 Mo » sans plafond de lignes — une limite que le code n'appliquait pas.

## Flotte mono-bateau (#603, #823)

**Un seul bateau ⇒ aucun sélecteur de bateau, ce bateau est retenu d'office.** La règle passe par `inertia/composables/use_single_boat.ts` (`useSingleBoat(() => props.boats)` → `singleBoat`, `singleBoatId` au format `BaseSelect`, `hasSingleBoat`) — ne pas réécrire un `boats.length === 1` local.

- **Créations (masquer + présélectionner)** : modales « Nouvelle sortie » (`QuickAddNavigationLogModal`) et « Nouvel incident » (`QuickAddIncidentModal`), modale « Nouvelle tâche » du tableau de bord (`QuickAddMaintenanceTaskModal` : la présélection passe par le setter de `selectedBoatId`, seul point qui déclenche le rechargement partiel `taskEquipment`), import/export CSV (`SettingsImportTab`, deux sélecteurs), invitation d'un `boat_owner` (`SettingsMembersInviteForm` : mention `settings.members.inviteForm.singleBoat` à la place des cases, `boatIds` rempli d'office), formulaire de période tarifaire (`PricingSeasonForm` : nouvelle saison rattachée au bateau, portée d'une saison éditée conservée). `ReservationCreateButton` saute son menu depuis #585.
- **Filtres de liste (masquer seulement, la liste est déjà celle du bateau)** : `NavigationBoatFilter` (journal de bord, carburant, incidents), filtre bateau de `/reservations`, de `/pricing/seasons`, `MaintenanceHistoryToolbar`, `EngineListToolbar`.
- **États vides** de `navigation/logbook.vue`, `fuel.vue`, `incidents.vue` : sans filtre, l'action mène à `/boats/:id/navigation` du bateau unique (libellé `*.empty.actionBoat`) au lieu de `/boats`.
- **Hors règle** : `BoatAssignModal` (affectation d'une place de port, « aucun bateau » reste choisissable) et les listes de bateaux.

## Pages d'erreur (403 / 404 / 419 / 429 / 500 / maintenance)

- Pages : `inertia/pages/errors/{forbidden,not_found,server_error,session_expired,too_many_requests}.vue` sur `inertia/layouts/error.vue`. `maintenance.vue` sur `inertia/layouts/bare.vue` (pas de coquille authentifiée).
- **Le layout se choisit selon la session** (#458) : coquille applicative (`default.vue`, sidebar + notifications) quand `props.user` est présent, `public.vue` sinon. Les trois pages tenaient auparavant sur le layout public : un utilisateur connecté qui tombait sur une erreur atterrissait sur l'habillage marketing et perdait toute la navigation.
- **Lien de sortie** : `use_error_page.ts` (`useErrorPageExit(cléAction)`) → `/dashboard` + le libellé de la page pour un utilisateur connecté (chaque rôle y a une vue dédiée via `HomeController#index`), `/` + `errors.backHome` pour un visiteur anonyme — `/dashboard` le renverrait sur l'écran de connexion.
- **Qui rend ces pages** : les `statusPages` de `app/exceptions/handler.ts` (404, 419, 429, 5xx) **et**, pour un refus d'ACL, une branche explicite du même handler. `E_AUTHORIZATION_FAILURE` est auto-gérée (elle porte sa propre `handle()`) : le handler de base la court-circuite avant d'atteindre les `statusPages`, et un GET HTML recevait `Access denied` en texte nu (#458). Seules les navigations HTML non-formulaire sont détournées vers `errors/forbidden` ; POST/PUT/PATCH/DELETE gardent le flash + retour en arrière de Bouncer, et les clients JSON son payload d'erreur.
- **419 et 429 sont aussi auto-gérés** (#864). `E_BAD_CSRF_TOKEN` (Shield, statut 403 sur la classe, redirection + flash) et `E_TOO_MANY_REQUESTS` (texte nu) n'atteignent pas les `statusPages`. Le handler les rend explicitement : page `errors/session_expired` en **419**, page `errors/too_many_requests` en **429** avec `Retry-After`. Inertia 2.3 ne rejoue pas un 419 (seul le 409 + `x-inertia-location` est spécial) : le bouton « Recharger » fait `router.reload()`, le brouillon n'est pas restauré. Les routes déjà flashées (`login.store`, `signup.store`, `demo.login`, `book.request`) gardent leur redirection. Un client JSON garde le corps du limiteur. Sur les chats IA publics, la page 429 propose `/signup`.
- **503 maintenance** : pas un rendu Inertia. Le middleware `maintenance_mode_middleware` (avant le body parser) répond par le HTML statique de `renderMaintenancePage()` — `share()` lirait la base, qui est souvent la cause de l'incident. `errors/maintenance.vue` est le jumeau visuel testé côté Vitest, pas la réponse HTTP. `/up` reste ouvert. Voir `docs/dev/hosting.md`.

## Layout authentifié — navigation & notifications

- Layout `inertia/layouts/default.vue` : sidebar desktop `AsideMenu.vue` (`hidden lg:flex`) + barre header mobile (`lg:hidden`, hamburger). Sections de nav construites par `use_nav_sections.ts`.
- **Bottom tab bar mobile** (#492) : `MobileBottomNav.vue` (`lg:hidden`), montée dans le flux du shell **hors du `<main>` scrollable** — jamais en `fixed`, donc aucun contenu recouvert — avec `pb-[env(safe-area-inset-bottom)]` pour l'indicateur home iOS (#484). 4 raccourcis max par rôle via `bottomNavItems` (`use_nav_sections.ts`, mêmes capabilities que la nav complète) : `mechanic` → Dashboard/Planning/Historique/Bateaux ; `admin`/`member` → Dashboard/Bateaux/Planning/Réservations ; `boat_owner` → barre masquée. Le drawer `MobileSidebarDrawer.vue` reste la navigation exhaustive — les deux coexistent.
- Cloche de notifications : `NotificationBell.vue`, montée **dans la sidebar** (`AsideMenu.vue`, à côté du logo, `align="left"`) **et dans le header mobile** (`default.vue`, à côté du hamburger). Props `align` (`left`/`right`, sens d'ouverture du panneau) et `tone` (`default`/`onDark`, contraste sur fond navy).
  - Badge de non-lus + panneau déroulant `NotificationPanel.vue` (5 dernières notifs, lien « Voir toutes » → `/notifications`). État temps réel via `use_notifications.ts` (singleton + abonnement Transmit `notifications/:userId`).
  - Page complète : `inertia/pages/notifications/index.vue`.
- **Copilote FleetAi** (#602, élargi #642, agent actionnable) : `components/assistant/` — `AssistantPanel.vue` (rail droit desktop / drawer mobile, surface navy permanente ; joint `pageUrl` aux POST — contexte de page ; pied de consommation `aiUsage { used, limit }` depuis la prop partagée enveloppée `assistantConversation`, avertissement + lien `/settings/billing` au-delà de 80 %), `AssistantThread.vue` (chips de suggestions de démarrage `starters` sur fil vide — clic = envoi du libellé i18n rendu), `AssistantMessage.vue` (bulles ; cartes `task_created`/`task_dismissed`/`action_done`/`action_dismissed`/`handoff` ; badge de source `assistant.sources.*` sous la bulle et lien de navigation `ASSISTANT_NAV_TARGETS` rendu en `<Link>` — tout en i18n, jamais du texte modèle), `AssistantActionCard.vue` (carte de confirmation générique par `kind`, bouton gardé par `ASSISTANT_ACTION_META`) + `AssistantActionSummary.vue`/`AssistantActionRow.vue`, `AssistantComposer.vue`, `AssistantUpsell.vue`. État : `use_assistant_panel.ts` (module-level, `localStorage`).

## Thème clair / sombre (#416)

- **Déclencheur** : attribut `data-theme="light" | "dark"` sur `<html>`, toujours résolu (jamais `system`).
  Écrit côté serveur dans `resources/views/inertia_layout.edge` pour un choix explicite ; sinon résolu
  avant le premier paint par le script inline anti-FOUC (nonce CSP) via `prefers-color-scheme`.
- **Tokens** : `inertia/css/app.css` — `@custom-variant dark` rattache le variant `dark:` à `data-theme`
  (et non plus à la media query), puis un bloc `[data-theme='dark']` **hors `@layer`** redéfinit les tokens
  sémantiques, les neutres chauds (`cream/paper/bone/sand`) et les extrémités des palettes d'accent
  (`-50`/`-100` deviennent des surfaces sombres, `-700`/`-800` de l'encre claire). Aucun composant ne porte
  de classe `dark:` : tout passe par les tokens.
- **Préférence** : `system | light | dark` (`shared/types/theme.ts`), persistée sur `users.theme` **et** dans
  un cookie signé 365j (`SettingsController.updateTheme`, route publique `POST /theme` pour le marketing et
  le login). Cascade profil > cookie > `system` dans `resolveSharedTheme` (`inertia_middleware.ts`),
  exposée en prop partagée `theme`.
- **Routes publiques `POST /locale` et `POST /theme`** : validées par `updateLocaleValidator` /
  `updateThemeValidator` en mode **tolérant** (`tryValidate`, pas `validateUsing`) — une valeur
  inconnue est ignorée sans erreur, contrat de #414 / #403 : ces switchers vivent sur des pages
  publiques où aucun formulaire Inertia ne porterait l'erreur de session. Bornées par
  `preferencesThrottle` (30/min/IP, compteur **partagé** entre les deux), parce qu'elles
  déclenchent chacune un `UPDATE` sur `users` dès qu'une session existe (#783).
- **Composable** : `inertia/composables/use_theme.ts` → `useTheme()` (`preference`, `resolved`, `setTheme`).
  Applique le thème immédiatement sur `<html>` puis persiste via `router.put`/`router.post` ; suit un
  changement d'OS à chaud tant que la préférence vaut `system`.
- **UI** : `ThemeSwitcher.vue` (3 icônes, prop `tone` — `onDark` pour la sidebar navy qui ne bascule pas)
  dans `AsideMenu`, `MobileSidebarDrawer`, `AppHeader` et `AppHeaderMobileDrawer` ; carte
  `settings/me/ThemeCard.vue` (appliquée au clic, sans bouton « Enregistrer »).
- **Tests, à trois niveaux** — Vitest tourne en happy-dom **sans aucune feuille de style** : il ne peut
  assertir que des noms de classes, jamais une couleur.
  1. `tests/inertia/theme_safe_components.spec.ts` — un test par composant touché (80) : relit le
     source et échoue sur toute couleur figée (palette Tailwind par défaut, `bg-white` opaque, hex
     brut). Lire le source plutôt que monter couvre toutes les branches, y compris les maps de
     classes. Les exceptions assumées vivent dans `allow`, avec une raison **et un nombre exact
     d'occurrences** : un budget dépassé rouvre le débat au lieu de couvrir la nouvelle venue.
     Détecteur partagé dans `tests/inertia/helpers/theme_tokens.ts`.
  2. Blocs `describe('dark mode (#416)')` dans les specs de composant existantes — assertions
     **positives** : chaque variante rend bien son token (`bg-brand` + `text-on-brand`, les 6
     variantes de `BaseBadge`, les 6 catégories de budget…).
  3. `tests/browser/dark_mode.spec.ts` — les **vraies couleurs**, seul niveau où le CSS est appliqué :
     luminance du fond dans les deux thèmes, contraste AA sur des sondes `data-theme-probe` de
     `/design-system` (route absente en production, #862), et préférence forcée qui survit à un rechargement complet (donc rendue par le
     serveur, sans flash). Nécessite `PLAYWRIGHT_CHROMIUM_EXECUTABLE` si le Chromium de Playwright
     n'est pas installé.
- **Illustrations autonomes non basculées** (palette interne cohérente) : carte marina
  (`ports/show/Marina*.vue`), dégradés `canvas/mesh_gradient_shared.ts`, scène `AboutOriginSection.vue`,
  panneau `AuthNavyPanel.vue` et bandeaux hero navy — sombres dans les deux thèmes.

## Galerie photo partagée

`inertia/components/media/MediaPhotoGallery.vue` — galerie réutilisable pilotée par props
(`uploadUrl`, `deleteUrlFor`, `photos`, `canUpload`, `canDelete`). Suppression via
`router.delete`. i18n : `media.photos.*`.

L'envoi lui-même vient de `inertia/composables/use_photo_upload.ts` — `usePhotoUpload(url)`
porte le formulaire multipart (`forceFormData`), les `ref` des deux entrées de fichiers,
`isOnline` et le refus explicite hors-ligne (#621). L'URL est acceptée en getter : côté
bateau elle dérive d'une prop. Les `ref` restent rendues à l'appelant, qui ouvre le
sélecteur depuis ses propres zones (état vide, tuile d'ajout, zone de dépôt).

Deux boutons d'upload (#485) : « Ajouter » ouvre le sélecteur (input `multiple`) et
« Prendre une photo » ouvre l'appareil photo via un **second input** `capture="environment"`
sans `multiple` — `capture` sur l'input principal supprimerait la sélection multiple sur
iOS/Android. Même montage dans `BoatPhotoGallery.vue` (fiche bateau, onglet « Photos »
depuis #811), qui partage le composable mais garde son propre rendu : i18n
`boats.show.mediaUpload.*`, légendes des photos, tuile d'ajout en fin de grille, grille à
quatre colonnes, suppression par `<Form>`.

Consommateurs : `InspectionPhotos.vue` (wrapper fin), et les onglets « Photos » des six équipements —
`EngineShowTabPhotos`, `EnginePartShowTabPhotos`, `SailShowTabPhotos`, `RigShowTabPhotos`,
`GenericShowTabPhotos`, `SafetyShowTabPhotos`.

## Accessibilité — modales, évitement, test axe (#861)

- **`BaseModal` gère le focus** via `useFocusTrap` (`inertia/composables/use_focus_trap.ts`) :
  - à l'ouverture, le focus va sur `initialFocus` (sélecteur CSS, prop optionnelle), sinon sur le premier élément focalisable du **corps** (pas le bouton « Fermer » de l'en-tête), sinon sur le panneau lui-même (`tabindex="-1"`) ;
  - `Tab` / `Maj+Tab` bouclent dans le dialogue, et un focus qui en sort y est ramené ;
  - à la fermeture, le focus revient à l'élément qui l'avait avant l'ouverture (le bouton déclencheur).
    Les pièges sont empilés : une modale ouverte depuis une autre prend la main, et `Échap` ne ferme que la dernière. Headless UI (`Dialog`) n'a pas été retenu : il impose son propre portail, incompatible avec le `Teleport` désactivé jusqu'au montage qui évite le mismatch d'hydratation SSR (#835).
- **Lien d'évitement** : premier élément du layout authentifié (`default.vue`), visible seulement au focus, il mène à `<main id="main" tabindex="-1">` (`common.skipToContent`).
- **Pas de nom accessible en dur** : un bouton icône porte un `aria-label` traduit (`common.increment` / `common.decrement` pour les steppers ; côté marketing, le libellé arrive par les props).
- **Contraste des tokens** : `fg-subtle` et `coral-700` (donc `danger-strong`) ont été assombris pour tenir 4.5:1 ; sur `surface-muted`, préférer `fg-muted` à `fg-subtle`.
- **Test automatique** : `tests/browser/a11y.spec.ts` passe axe-core (`@axe-core/playwright`, WCAG 2.1 A/AA) sur `/dashboard`, `/boats/:id`, `/planning` et `/settings/billing` dans les deux thèmes et sur une modale ouverte, sans tolérer de violation `serious`/`critical`. Il vérifie aussi au clavier le piège de focus et le lien d'évitement. Un nouvel écran clé s'ajoute à la liste des URL.

## Cibles tactiles (#494)

Sur les écrans terrain, tout contrôle interactif vise **≥ 44 px** de zone tactile (Apple HIG).
Deux techniques, au choix :

- **taille pleine** quand le visuel le permet (hamburger mobile : `w-11 h-11`) ;
- **pseudo-zone `pointer-coarse:`** quand agrandir le visuel déséquilibrerait la mise en page :
  `relative pointer-coarse:before:absolute pointer-coarse:before:content-[''] pointer-coarse:before:-inset-*`
  — n'agit que sur écran tactile, la densité desktop est intacte. Exemples : case à cocher des
  fiches d'entretien (20 px visuels + `-inset-3` = 44 px), bouton de fermeture du drawer.

`BaseButton` porte ce mécanisme nativement : `sm` (32 px) et `icon` (32 px) étendent de 12 px,
`md` (40 px) de 4 px, `lg` est déjà à 44 px — `size="sm"` reste donc utilisable sur les écrans
terrain. ⚠️ Écrire les classes en littéral complet : le scanner Tailwind ne voit pas les noms
concaténés. Mesure réelle en navigateur : prévue par #500.

### Vocabulaires métier partagés (#585)

Quatre écrans lisent des listes de valeurs qui ne vivent **jamais** dans le composant :

- **Titres de navigation** — `useNavigationTitles()` (`inertia/composables/use_navigation_titles.ts`)
  sert à la fois le select des certifications (`CrewCertificationForm.vue`), son badge
  (`CrewCertificationBadge.vue`), le select des permis clients (`ClientForm.vue`) et la
  colonne permis de `clients/index.vue`. Libellés sous `common.navigationTitles.*`.
  Le select client réinjecte la valeur déjà enregistrée si elle ne fait plus partie
  des options : sans ça, une fiche saisie avant #585 s'ouvrirait avec un select vide
  et l'enregistrement effacerait son permis.
- **Date d'expiration proposée** — `CrewCertificationForm.vue` suggère `expiresAt`
  d'après `suggestedExpiryDate()` et n'écrase jamais une date saisie ; un `hint`
  signale que la valeur est une proposition.
- **Type de prestation** — `RESERVATION_TYPES` alimente les selects
  (`ReservationForm.vue`, `ReservationEditModal.vue`), le badge
  `ReservationTypeBadge.vue` (listes) et le filtre de `reservations/index.vue`.
  Calendrier et frise sont trop denses pour un badge : le type y passe par
  l'attribut `title` de la pastille.
- **Carburant** — `useBoatOptions().engineFuelOptions` alimente le select carburant
  de `BoatFuelLogForm.vue`, pré-rempli d'après le moteur sélectionné (jamais par-dessus
  une saisie), et `engineFuelLabel()` l'affichage (onglet Carburant, `FuelLogRow.vue`,
  `FuelLogCard.vue`).

## Actions de ligne révélées au survol (#735)

Les tableaux qui cachent leurs actions (`opacity-0 group-hover:opacity-100`) doivent
en faire autant au clavier et les nommer :

- ajouter `group-focus-within:opacity-100` — sans lui, la cible reste invisible à la
  tabulation, `group-hover` ne réagissant qu'à la souris ;
- une icône seule n'a **pas** de nom accessible : un attribut `title` ne suffit pas et
  le SVG n'a pas de `<title>`. Poser un `aria-label`, de préférence contextualisé par
  la ligne (`reservations.actions.contractFor` → « Rental contract for {client} »),
  sinon vingt lignes annoncent toutes le même nom.

Référence : `ReservationRowActions.vue`, rendu par `ReservationList.vue` (état des lieux, contrat, paiement, modifier, supprimer). Les
tests navigateur ciblent alors l'action par son rôle et son nom accessible plutôt que
par `[title="…"]` — ce que voit Playwright est ce qu'annonce un lecteur d'écran.

## Reservations — chemin vers la facture (#735)

Les deux listes de réservations portent la même colonne « Documents » : les devis et
factures déjà émis (`linkedInvoices`) et le bouton « Créer un devis » sous le flag
`canCreateQuote`.

- `reservations/index.vue` → `FleetReservationList.vue` (page flotte) ;
- synchronisation iCal (#880) : `components/reservations/calendar_sync/` — `BoatCalendarSyncCard.vue` sur `boats/reservations.vue` (export `CalendarFeedPanel.vue` + import `ExternalCalendarList.vue`), `CalendarFeedPanel` dans la carte « Flux iCal de la flotte » de `reservations/index.vue` ; créneaux importés en violet pointillé dans `ReservationCalendar.vue` (prop `externalBlocks`) et `ReservationTimelineRow.vue` (`entry.external`), légende dans `ReservationTimeline.vue` — test `tests/inertia/calendar_sync.spec.ts`
- `boats/reservations.vue` : bandeau `BoatAvailabilityBanner` et, pour un admin (`canForceUnavailable`), champ « motif de forçage » de `ReservationForm.vue` quand le statut est `confirmed` (#870)
- `boats/reservations.vue` → `ReservationList.vue` (`/boats/:id/reservations`, l'écran
  de l'état des lieux de retour). La colonne y est masquée quand elle n'a rien à
  montrer, pour ne pas ajouter une colonne vide aux orgs sans facturation.

Le bouton poste sur `POST /invoices/from-reservation/:id` (`router.post`,
`preserveScroll`) et le contrôleur redirige vers la fiche du devis.

## Reservations — paiement et caution (#875)

- Colonne « Paiement » des deux listes : `payment/ReservationPaymentBadge.vue` (acompte
  attendu, solde à encaisser, sinon statut de paiement ; rien pour une option non réglée).
  Le calendrier `ReservationCalendar.vue` pose un point `bg-danger` sur la pastille et
  complète l'infobulle.
- Action « Paiement » de `ReservationRowActions.vue` → `payment/ReservationPaymentModal.vue`,
  qui relit la ligne dans la prop `reservations` (elle suit chaque encaissement sans se
  refermer) → `payment/ReservationPaymentPanel.vue` : montants, moyen, « Acompte reçu »,
  « Solde reçu », « Rembourser » (confirmation native), puis `payment/SecurityDepositPanel.vue`.
- `boats/reservation_inspection.vue` : bloc « Caution » (`SecurityDepositPanel`) sous la
  comparaison départ/retour, prop `canManagePayment`.
- Mutations : `router.patch` sur `/payment` et `/security-deposit`, `preserveScroll`,
  `only` = props de la page hôte (`reservations` ou `reservation`, `errors`, `flash`).

## Repli carte mobile des tableaux (#493)

Les écrans terrain ne laissent jamais un tableau en scroll horizontal seul sur mobile : chaque
table est doublée d'un bloc cartes, sur le motif de `boats/index.vue` :

```
<div class="lg:hidden space-y-3">  …cartes…  </div>
<div class="hidden lg:block overflow-x-auto">  …table existante…  </div>
```

- `navigation/logbook.vue` → `LogbookCard.vue` (à côté de `LogbookRow.vue`, mêmes props)
- `navigation/fuel.vue` → `FuelLogCard.vue`
- `navigation/incidents.vue` → `IncidentCard.vue`
- `MaintenanceHistoryTimeline.vue` → `MaintenanceHistoryCard.vue` (la rangée desktop garde ses
  badges en ligne ; la carte empile tout et porte son propre état déplié)
- `dashboard/DashboardBoatsCard.vue` → `DashboardBoatCard.vue` (« Vos bateaux » du tableau de bord,
  #828 ; la table desktop a perdu son `min-w-[520px]`)

L'information y est hiérarchisée (trajet/date d'abord, champs secondaires ensuite), pas transposée
colonne à colonne. Non-régression : `tests/inertia/table_card_collapse.spec.ts` (mêmes données que
les lignes + classes de breakpoint), débordement horizontal couvert par #500.

## Patterns UI (forms)

Le projet utilise le composant `<Form>` fourni par `@adonisjs/inertia/vue`.

Exemple: `BoatShowTabTasks.vue` / `BoatShowTabHistory.vue` contiennent:

- create task/event
- mark done
- delete task/event
