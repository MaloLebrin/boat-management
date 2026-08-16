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
  - `components/auth/signup/SignupIdentityFields.vue` — `firstName`, `lastName`, `email`, `password` (+ `PasswordStrength`, bouton Afficher/Masquer). Les bornes du mot de passe (placeholder, hint, `minlength`/`maxlength`) sont interpolées depuis `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` (`shared/constants/auth.ts`), les mêmes constantes que le validator (#455)
  - `components/auth/signup/SignupOrganizationFields.vue` — `organizationName`, `organizationType`, `fleetSize` ; les options des deux selects sont générées depuis `ORGANIZATION_TYPES` / `FLEET_SIZES` (`shared/types/organization.ts`), les mêmes constantes que le validator
  - `components/auth/signup/SignupTermsCheckbox.vue` — case `acceptTerms` avec son propre emplacement d'erreur ; les mentions CGU / confidentialité sont des `<Link>` localisés (`/fr/cgu`•`/en/terms`, `/fr/confidentialite`•`/en/privacy`) ouverts dans un nouvel onglet pour ne pas perdre le formulaire (#455)
  - `components/auth/signup/SignupSectionHeader.vue` — en-tête numéroté « 01 / 02 »
- Puces du plan gratuit sous le bouton (`STARTER_FEATURES`) : construites depuis `PLAN_LIMITS.starter` (bateaux, membres) avec des clés ICU au pluriel — la page annonçait « utilisateurs illimités » alors que Starter en autorise 1 (#455)
- `components/base/BaseFormErrorSummary.vue` en tête de formulaire : reçoit `handled-keys` (les champs qui affichent déjà leur erreur sous l'input) et rend en bandeau `danger` **toutes les autres** erreurs. Sans lui, un champ de validator sans input rend l'échec invisible — c'est exactement le bug #448. Réutilisable sur tout formulaire Inertia.

### Dashboard

- Page: `inertia/pages/dashboard.vue`
- Props: `boats`, `urgentMaintenance`, `stats`
- Source backend: `DashboardService.getForUser()` appelé depuis `HomeController.index`
- Composants:
  - KPIs: `inertia/components/dashboard/DashboardStatsGrid.vue` — grille des 5 cartes stats ; si aucun équipement saisi (0 moteur/voile/gréement), les 3 cartes équipement sont remplacées par une carte combinée avec CTA « Saisir vos équipements » → `/boats` (#419)
  - En-tête: chips d'action « + Entrée journal » / « + Incident » (`DashboardQuickAddActions.vue`) distinctes du lien de navigation « Bateaux » (variante `ghost` + flèche, #419)
  - Assistant IA: `inertia/components/dashboard/DashboardAiPanel.vue` — panneau navy **permanent** (sombre dans les deux thèmes, cf. `CLAUDE.md`), extrait de la page en #457. Il porte son propre état (`isAnalyzing`, garde `canUseAI` → `UpgradePlanModal`) et poste sur `/ai/fleet-analysis` ; la page ne lui passe que `aiFleetAnalysis`. Pendant de `BoatOverviewAiPanel.vue` sur la fiche bateau.

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

- Pages : `inertia/pages/marketing/{home,pricing,about,contact,guide,simulator,simulator_share,privacy,terms,sales_terms,legal_notice}.vue` — rendues par `MarketingController` (routes locale-préfixées `/en`, `/fr`, voir `start/routes/marketing.ts`), layout `inertia/layouts/public.vue`
- Pages légales : `privacy.vue` (`/fr/confidentialite`, `/en/privacy`), `terms.vue` (`/fr/cgu`, `/en/terms`, #455), `sales_terms.vue` (`/fr/cgv`, `/en/sales-terms`, #466) et `legal_notice.vue` (`/fr/mentions-legales`, `/en/legal-notice`, #466) ne portent que leur `<Head>` et délèguent le rendu à `components/marketing/legal/LegalDocumentSections.vue` (hero + sections numérotées + bloc contact, plus une fiche « libellé : valeur » via `LegalSection.entries`), alimenté par le type `LegalDocument` de `shared/types/marketing.ts`. Les quatre sont liées depuis la colonne « Légal » du footer public (et les CGU depuis la case du signup), et référencées au sitemap avec leurs alternates hreflang. L'identité affichée par les mentions légales vient des variables `LEGAL_*` (`config/legal.ts`), pas de l'i18n — voir `docs/dev/mentions-legales.md`
- i18n : textes construits côté serveur depuis `resources/lang/{en,fr}/marketing.json` et passés en prop `t` (namespace exclu de `appT`)
- Composants par page dans `inertia/components/marketing/{home,pricing,about,contact,simulator,guide}/`
- Simulateur (#464) : les champs numériques de la première étape vivent dans `simulator/SimulatorBoatDimensionsFields.vue` — ils conservent la saisie **texte** et n'émettent qu'une valeur parsée (`parseDecimalInput` de `shared/helpers/number_format.ts`, qui lit le point comme la virgule), jamais un `Number()` réinjecté dans le champ. Les longueurs affichées passent par `formatLength` (`useNumberFormat()` côté composant, le helper partagé avec locale explicite pour le titre Open Graph de `simulator_share.vue`) : `10,5 m` en FR, `10.5 m` en EN, jamais `{length}m` collé. Le namespace `simulator` est au **tutoiement** comme le reste du marketing
- Prix et compteurs (#465) : un prix affiché passe par `formatPrice` (`useNumberFormat()`, helper partagé `shared/helpers/number_format.ts`) — jamais `{{ price }} €` collé dans le template, sinon la page EN annonce « 20 € » à côté d'un texte disant « €20 ». Concerne `home/HomeModularOfferSection.vue`, `pricing/{PricingModulesSection,PricingConfigurator,PricingConfiguratorModuleCard,PricingDetailedTableSection,PricingROISection}.vue`. Les chiffres animés (`HomeStatValue.vue` → `use_count_up.ts`) regroupent leurs milliers via `Intl.NumberFormat` sur la locale de l'app (`28 240` en FR, `28,240` en EN) et lisent la virgule française comme un séparateur **décimal**
- Mockups d'écran de la home (`home/HomeMock{Dashboard,BoatDetail,Planning,Fleetide,UpcomingTasks}.vue`) : faux screenshots au texte français écrit en dur — ils ne passent pas par `t()` et échappent donc aux relectures i18n, penser à les inclure dans toute passe d'orthographe
- Formulaire de contact (#450) : `contact/ContactFormSection.vue` poste sur `POST /contact` via `useForm` (`preserveScroll`), erreurs VineJS affichées par champ, panneau de confirmation piloté par la prop `contactSent` (flash relu par `MarketingController.contact`) puis par l'état local après `onSuccess`. Barre latérale extraite en `ContactFormSidebar.vue`, pastilles sujet/taille de flotte en `ContactPillGroup.vue`. Les cartes de `ContactChannelsSection.vue` sont des liens : ancre `#contact-form`, `<Link>` `/signup`, `mailto:` support et presse.
- Canvas décoratifs (`inertia/components/marketing/canvas/`, tous `aria-hidden`, cycle de vie via `use_canvas_lifecycle.ts`) :
  - `GradientMeshCanvas.vue` — dégradé WebGL (repli 2D) : heros home (`navy`), tarifs (`sunset`), about (`dawn`)
  - `PortsMapCanvas.vue` — carte pointillée + arcs : `HomeStatsBandSection` (`dark`, bande navy), hero contact (`light`)
  - `ParticleNetworkCanvas.vue` — particules réactives souris : `HomeFinalCtaSection`
- Détail des animations : `inertia/css/ANIMATIONS.md`

### Settings — facturation (`/settings/billing`)

- Page : `inertia/pages/settings/billing.vue` → `components/settings/tabs/SettingsBillingTab.vue` (props `plan`, `quotaUsage`, `subscription`, `orgModules`, `orgAddons`, servies par `SettingsController.billing`)
- Sous-composants (le tab reste sous la limite de 250 lignes) :
  - `SettingsBillingUsageGauge.vue` — jauges bateaux / membres / stockage / tokens IA
  - `SettingsBillingFeatureList.vue` — capacités du plan. Deux lignes IA distinctes (#456) : « IA / Copilote » (depuis `quotaUsage.canUseAI`) et « Personnalisation IA (prompt métier) » (depuis `PLAN_LIMITS[plan].canCustomizeAI`, qu'aucun module add-on n'accorde). En Pro la première est cochée et la seconde non — les fusionner laissait croire que `/settings/ai` était accessible
  - `SettingsBillingSubscriptionNotice.vue` — bandeau affiché quand `plan === 'pro' && subscription === null` (#456). L'organisation **a** le plan Pro en base mais aucun abonnement Stripe actif ; le bandeau nomme le plan possédé et explique que modules et add-ons sont facturés sur l'abonnement. CTA « Finaliser l'abonnement » (→ `startCheckout('pro')`) pour un porteur de `subscription.manage`, renvoi vers un administrateur sinon
  - `SettingsBillingModules.vue` — modules add-ons (`charter`, `crm_invoicing`)
  - `SettingsBillingExtraBoats.vue` — add-on quantitatif `extra_boats` (stepper). Même distinction plan/abonnement que les modules : la branche « Pro sans abonnement actif » propose de finaliser l'abonnement, la branche Starter affiche « Disponible à partir du plan Pro »
- **Plan ≠ abonnement** : `plan` est une colonne de `organizations`, `subscription` l'abonnement Stripe actif. Tout libellé qui les confond finit par nier au client un plan qu'il possède — c'est le bug #456. Les libellés « Nécessite un plan Pro actif » sont réservés au vrai Starter.
- Écrans gatés (`/invoices`, `/pricing/seasons`, `/clients`, `/settings/ai`, `/settings/branding`) : la redirection d'upsell vise `/settings/billing` (`BILLING_SETTINGS_PATH`) et **jamais** `/`, qui redirige sur `/en` — le layout public ne rend aucun toast, le flash y serait perdu (#456).

## Pages d'erreur (403 / 404 / 500)

- Pages : `inertia/pages/errors/{forbidden,not_found,server_error}.vue`, layout `inertia/layouts/error.vue`.
- **Le layout se choisit selon la session** (#458) : coquille applicative (`default.vue`, sidebar + notifications) quand `props.user` est présent, `public.vue` sinon. Les trois pages tenaient auparavant sur le layout public : un utilisateur connecté qui tombait sur une erreur atterrissait sur l'habillage marketing et perdait toute la navigation.
- **Lien de sortie** : `use_error_page.ts` (`useErrorPageExit(cléAction)`) → `/dashboard` + le libellé de la page pour un utilisateur connecté (chaque rôle y a une vue dédiée via `HomeController#index`), `/` + `errors.backHome` pour un visiteur anonyme — `/dashboard` le renverrait sur l'écran de connexion.
- **Qui rend ces pages** : les `statusPages` de `app/exceptions/handler.ts` (404, 5xx) **et**, pour un refus d'ACL, une branche explicite du même handler. `E_AUTHORIZATION_FAILURE` est auto-gérée (elle porte sa propre `handle()`) : le handler de base la court-circuite avant d'atteindre les `statusPages`, et un GET HTML recevait `Access denied` en texte nu (#458). Seules les navigations HTML non-formulaire sont détournées vers `errors/forbidden` ; POST/PUT/PATCH/DELETE gardent le flash + retour en arrière de Bouncer, et les clients JSON son payload d'erreur.

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
