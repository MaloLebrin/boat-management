# Frontend — UI map (Inertia/Vue)

## Entrée Inertia

Référence: `inertia/app.ts`.

- résout les pages via `./pages/${name}.vue` et `import.meta.glob('./pages/**/*.vue')`
- applique le layout par défaut `inertia/layouts/default.vue`
- SSR désactivé (voir `config/inertia.ts`)

## Pages principales

### Dashboard

- Page: `inertia/pages/dashboard.vue`
- Props: `boats`, `urgentMaintenance`, `stats`
- Source backend: `DashboardService.getForUser()` appelé depuis `HomeController.index`

### Boats (liste / création / édition)

- `boats/index`: `inertia/pages/boats/index.vue`
  - props: `boats[]`
  - backend: `BoatsController.index` → `BoatService.listForUser`
- `boats/new`: `inertia/pages/boats/new.vue`
  - form POST `/boats`
  - composant: `BoatFormHullFields`
  - backend: `BoatsController.store`
- `boats/edit`: `inertia/pages/boats/edit.vue`
  - form PUT `/boats/:id`
  - delete via form DELETE `/boats/:id`
  - backend: `BoatsController.update` / `BoatsController.destroy`

### Boat show (équipement + maintenance)

- Page: `inertia/pages/boats/show.vue`
- Composants:
  - specs: `inertia/components/boats/hull/BoatShowSpecsCard.vue`
  - engines: `inertia/components/boats/engine/BoatShowEnginesCard.vue`
  - sails: `inertia/components/boats/sail/BoatShowSailsCard.vue`
  - rig: `inertia/components/boats/rig/BoatShowRigCard.vue`
  - maintenance: `inertia/components/boats/maintenance/BoatShowMaintenanceSection.vue`
  - equipment-actions (onglet "Achats/réparations"):
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue` — carte individuelle action
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue` — modal création/édition (prop `prefill` pour l'ajout depuis un équipement, #313)
    - `inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue` — onglet liste avec filtres
  - onglet Équipement : `BoatShowTabEquipment.vue` héberge le modal d'action ; `BoatGenericEquipmentRow.vue` (extrait de `BoatGenericEquipmentCard.vue`) / `BoatSafetyEquipmentCard.vue` exposent un bouton « Ajouter à la liste » sur les items dégradés (#313)
- Props (types): `inertia/types/boat_show.ts`
- Source backend: `BoatsController.show`

### Equipment edit pages

- engines: `inertia/pages/boats/engine_edit.vue` (PUT `/boats/:boatId/engines/:engineId`)
- sails: `inertia/pages/boats/sail_edit.vue` (PUT `/boats/:boatId/sails/:sailId`)
- rig: `inertia/pages/boats/rig_edit.vue` (PUT `/boats/:boatId/rig`)

### Budget

- Page: `inertia/pages/boats/budget.vue` (GET `/boats/:id/budget?year=`)
- Composants:
  - `inertia/components/boats/budget/BudgetBarChart.vue` — graphique mensuel par catégorie
  - `inertia/components/boats/budget/BudgetCategoryCard.vue` — carte totaux par catégorie
  - `inertia/components/boats/budget/BudgetPortStayForm.vue` — formulaire ajout séjour port
  - `inertia/components/boats/budget/BudgetPortStayList.vue` — liste séjours port avec suppression
  - `inertia/components/boats/budget/BudgetEntryForm.vue` — formulaire dépense libre (catégorie, montant, date)
  - `inertia/components/boats/budget/BudgetEntryList.vue` — liste dépenses libres avec badges catégorie
- Props: `boat`, `budget`, `year`, `portStays`, `entries`, `canManage`
- Types frontend: `inertia/types/budget.ts`
- Source backend: `BudgetController.show`

### Marketing (pages publiques)

- Pages : `inertia/pages/marketing/{home,pricing,about,contact,guide,simulator,simulator_share}.vue` — rendues par `MarketingController` (routes locale-préfixées `/en`, `/fr`, voir `start/routes/marketing.ts`), layout `inertia/layouts/public.vue`
- i18n : textes construits côté serveur depuis `resources/lang/{en,fr}/marketing.json` et passés en prop `t` (namespace exclu de `appT`)
- Composants par page dans `inertia/components/marketing/{home,pricing,about,contact,simulator,guide}/`
- Canvas décoratifs (`inertia/components/marketing/canvas/`, tous `aria-hidden`, cycle de vie via `use_canvas_lifecycle.ts`) :
  - `GradientMeshCanvas.vue` — dégradé WebGL (repli 2D) : heros home (`navy`), tarifs (`sunset`), about (`dawn`)
  - `PortsMapCanvas.vue` — carte pointillée + arcs : `HomeStatsBandSection` (`dark`, bande navy), hero contact (`light`)
  - `ParticleNetworkCanvas.vue` — particules réactives souris : `HomeFinalCtaSection`
- Détail des animations : `inertia/css/ANIMATIONS.md`

## Galerie photo partagée

`inertia/components/media/MediaPhotoGallery.vue` — galerie réutilisable pilotée par props
(`uploadUrl`, `deleteUrlFor`, `photos`, `canUpload`, `canDelete`). Upload via `useForm` +
`form.post(..., { forceFormData: true })`, suppression via `router.delete`. i18n : `media.photos.*`.

Consommateurs : `InspectionPhotos.vue` (wrapper fin).

## Patterns UI (forms)

Le projet utilise le composant `<Form>` fourni par `@adonisjs/inertia/vue`.

Exemple: `BoatShowMaintenanceSection.vue` contient:

- create task/event
- mark done
- delete task/event
