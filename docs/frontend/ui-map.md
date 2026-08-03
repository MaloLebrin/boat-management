# Frontend — UI map (Inertia/Vue)

## Entrée Inertia

Référence: `inertia/app.ts`.

- résout les pages via `./pages/${name}.vue` et `import.meta.glob('./pages/**/*.vue')`
- applique le layout par défaut `inertia/layouts/default.vue`
- SSR désactivé (voir `config/inertia.ts`)

## Pages principales

### Auth — inscription (#448)

- Page: `inertia/pages/auth/signup.vue` — `<Form route="new_account.store">`, backend `NewAccountController.store` + `signupValidator`
- Sections (la page reste sous la limite de 250 lignes) :
  - `components/auth/signup/SignupIdentityFields.vue` — `firstName`, `lastName`, `email`, `password` (+ `PasswordStrength`, bouton Afficher/Masquer)
  - `components/auth/signup/SignupOrganizationFields.vue` — `organizationName`, `organizationType`, `fleetSize` ; les options des deux selects sont générées depuis `ORGANIZATION_TYPES` / `FLEET_SIZES` (`shared/types/organization.ts`), les mêmes constantes que le validator
  - `components/auth/signup/SignupTermsCheckbox.vue` — case `acceptTerms` avec son propre emplacement d'erreur
  - `components/auth/signup/SignupSectionHeader.vue` — en-tête numéroté « 01 / 02 »
- `components/base/BaseFormErrorSummary.vue` en tête de formulaire : reçoit `handled-keys` (les champs qui affichent déjà leur erreur sous l'input) et rend en bandeau `danger` **toutes les autres** erreurs. Sans lui, un champ de validator sans input rend l'échec invisible — c'est exactement le bug #448. Réutilisable sur tout formulaire Inertia.

### Dashboard

- Page: `inertia/pages/dashboard.vue`
- Props: `boats`, `urgentMaintenance`, `stats`
- Source backend: `DashboardService.getForUser()` appelé depuis `HomeController.index`
- Composants:
  - KPIs: `inertia/components/dashboard/DashboardStatsGrid.vue` — grille des 5 cartes stats ; si aucun équipement saisi (0 moteur/voile/gréement), les 3 cartes équipement sont remplacées par une carte combinée avec CTA « Saisir vos équipements » → `/boats` (#419)
  - En-tête: chips d'action « + Entrée journal » / « + Incident » (`DashboardQuickAddActions.vue`) distinctes du lien de navigation « Bateaux » (variante `ghost` + flèche, #419)

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
  - maintenance: `inertia/components/boats/show/tabs/BoatShowTabTasks.vue` (onglet « Tâches ») et `inertia/components/boats/show/tabs/BoatShowTabHistory.vue` (onglet « Historique »)
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

## Layout authentifié — navigation & notifications

- Layout `inertia/layouts/default.vue` : sidebar desktop `AsideMenu.vue` (`hidden lg:flex`) + barre header mobile (`lg:hidden`, hamburger). Sections de nav construites par `use_nav_sections.ts`.
- Cloche de notifications : `NotificationBell.vue`, montée **dans la sidebar** (`AsideMenu.vue`, à côté du logo, `align="left"`) **et dans le header mobile** (`default.vue`, à côté du hamburger). Props `align` (`left`/`right`, sens d'ouverture du panneau) et `tone` (`default`/`onDark`, contraste sur fond navy).
  - Badge de non-lus + panneau déroulant `NotificationPanel.vue` (5 dernières notifs, lien « Voir toutes » → `/notifications`). État temps réel via `use_notifications.ts` (singleton + abonnement Transmit `notifications/:userId`).
  - Page complète : `inertia/pages/notifications/index.vue`.

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
     `/design-system`, et préférence forcée qui survit à un rechargement complet (donc rendue par le
     serveur, sans flash). Nécessite `PLAYWRIGHT_CHROMIUM_EXECUTABLE` si le Chromium de Playwright
     n'est pas installé.
- **Illustrations autonomes non basculées** (palette interne cohérente) : carte marina
  (`ports/show/Marina*.vue`), dégradés `canvas/mesh_gradient_shared.ts`, scène `AboutOriginSection.vue`,
  panneau `AuthNavyPanel.vue` et bandeaux hero navy — sombres dans les deux thèmes.

## Galerie photo partagée

`inertia/components/media/MediaPhotoGallery.vue` — galerie réutilisable pilotée par props
(`uploadUrl`, `deleteUrlFor`, `photos`, `canUpload`, `canDelete`). Upload via `useForm` +
`form.post(..., { forceFormData: true })`, suppression via `router.delete`. i18n : `media.photos.*`.

Consommateurs : `InspectionPhotos.vue` (wrapper fin), et les onglets « Photos » des six équipements —
`EngineShowTabPhotos`, `EnginePartShowTabPhotos`, `SailShowTabPhotos`, `RigShowTabPhotos`,
`GenericShowTabPhotos`, `SafetyShowTabPhotos`.

## Patterns UI (forms)

Le projet utilise le composant `<Form>` fourni par `@adonisjs/inertia/vue`.

Exemple: `BoatShowTabTasks.vue` / `BoatShowTabHistory.vue` contiennent:

- create task/event
- mark done
- delete task/event
