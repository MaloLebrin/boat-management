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
- Composants:
  - specs: `inertia/components/boats/hull/BoatShowSpecsCard.vue`
  - engines: `inertia/components/boats/engine/BoatShowEnginesCard.vue`
  - sails: `inertia/components/boats/sail/BoatShowSailsCard.vue`
  - rig: `inertia/components/boats/rig/BoatShowRigCard.vue`
  - maintenance: `inertia/components/boats/show/tabs/BoatShowTabTasks.vue` (onglet « Tâches ») et `inertia/components/boats/show/tabs/BoatShowTabHistory.vue` (onglet « Historique »)
    - `BoatMaintenanceTasksPanel.vue` garde le point d'entrée de création et délègue le formulaire à `BoatMaintenanceTaskForm.vue` (#581)
    - le champ titre du formulaire de tâche et des modales d'événement (`BoatMaintenanceEventModal.vue`, `EngineMaintenanceEventModal.vue`) est une `BaseCombobox` alimentée par le catalogue d'opérations standard, via `inertia/composables/use_maintenance_operations.ts` (#581) — la saisie libre reste acceptée telle quelle
  - equipment-actions (onglet "Achats/réparations"):
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue` — carte individuelle action
    - `inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue` — modal création/édition (prop `prefill` pour l'ajout depuis un équipement, #313)
    - `inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue` — onglet liste avec filtres
  - onglet Équipement : `BoatShowTabEquipment.vue` héberge le modal d'action ; `BoatGenericEquipmentRow.vue` (extrait de `BoatGenericEquipmentCard.vue`) / `BoatSafetyEquipmentCard.vue` exposent un bouton « Ajouter à la liste » sur les items dégradés (#313)
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
la nav et la carte ports du dashboard sont masquées via `effectiveQuotas.canManagePorts`.

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
- Props: `boat`, `budget`, `year`, `portStays`, `entries`, `canManage`
- Types frontend: `inertia/types/budget.ts`
- Source backend: `BudgetController.show`

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

### Liens et navigation (#533)

- **Navigation interne = `<Link>` (`@adonisjs/inertia/vue`)**, jamais `<a href="/…">` : une ancre brute recharge l'app entière. Deux règles ESLint le tiennent (`vue/no-restricted-static-attribute`, `vue/no-restricted-v-bind` sur `inertia/**/*.vue`).
- **`BaseButton` applique la règle tout seul** : `href` interne → `<Link>`, `href` absolu (`https:`/`mailto:`/`tel:`) → ancre. La prop **`external-href`** force l'ancre sur un chemin interne — à réserver aux téléchargements et exports (`ContractPanel`, export CSV de `boats/budget.vue`), qu'une visite Inertia rendrait comme une page.
- **`<Link target="_blank">` n'ouvre pas de nouvel onglet** : `shouldIntercept()` d'Inertia ne regarde que les touches de modification et le bouton de la souris, jamais `target`. Un vrai nouvel onglet demande une ancre `<a target="_blank" rel="noopener">` — c'est le cas des liens CGU/confidentialité de `SignupTermsCheckbox` et du consentement de `ContactFormSection`, qui protègent un formulaire à moitié rempli.
- **Les 14 ancres restantes** (téléchargements, `mailto:`/`tel:`, URL externes des mentions légales) portent chacune un `eslint-disable` qui en donne la raison — c'est là qu'il faut regarder avant d'en ajouter une.
- **Côté tests** : `tests/inertia/setup.ts` mocke `Link` globalement (le vrai composant exige un `TuyauProvider`). Un test qui pose son propre `vi.mock('@adonisjs/inertia/vue', …)` remplace ce mock **entièrement** et doit donc réexporter `Link`.

### Marketing (pages publiques)

- Pages : `inertia/pages/marketing/{home,pricing,about,contact,guide,simulator,simulator_share,privacy,terms,sales_terms,legal_notice,diagnosis_ai}.vue` — rendues par `MarketingController` (routes locale-préfixées `/en`, `/fr`, voir `start/routes/marketing.ts`), layout `inertia/layouts/public.vue` ; `diagnosis_ai.vue` est rendue par `PublicDiagnosisController` (#602)
- Slugs localisés (#475) : `MARKETING_SLUGS` (`shared/helpers/locale_path.ts`) est la **source de vérité unique** du slug de chaque page marketing dans les deux locales, aligné sur `start/routes/marketing.ts`. Un lien, un `canonical`/`hreflang` ou une entrée de sitemap ne s'écrit **jamais** en interpolant la locale (`/${locale}/tarifs`) ni en ternaire (`locale === 'fr' ? … : …`) : on passe par `marketingPath(page, locale)`. En dépendent `AppHeader.vue`, `AppHeaderMobileDrawer.vue`, le footer de `layouts/public.vue`, `home/{HomeFaqCtaSection,HomeDemoSection}.vue`, le `ctaHref` de la section diagnostic (`MarketingController`), le `ctaHref` de l'offre modulaire (`MarketingController`), les `<Head>` des dix pages marketing et le générateur de `sitemap.xml` (`start/routes/home.ts`). Le sélecteur de langue dérive du même table (`LOCALIZED_PATH_ALIASES`), ce qui lui évite le 404 qu'il produisait sur simulateur, guide, confidentialité, CGU, CGV et mentions légales — dont les slugs diffèrent d'une locale à l'autre
- Page tarifs (#475) : `/en/pricing` en anglais, `/fr/tarifs` en français ; `/en/tarifs` ne subsiste que comme redirection 301 (`marketing.en.pricing_legacy`)
- Pages légales : `privacy.vue` (`/fr/confidentialite`, `/en/privacy`), `terms.vue` (`/fr/cgu`, `/en/terms`, #455), `sales_terms.vue` (`/fr/cgv`, `/en/sales-terms`, #466) et `legal_notice.vue` (`/fr/mentions-legales`, `/en/legal-notice`, #466) ne portent que leur `<Head>` et délèguent le rendu à `components/marketing/legal/LegalDocumentSections.vue` (hero + sections numérotées + bloc contact, plus une fiche « libellé : valeur » via `LegalSection.entries`), alimenté par le type `LegalDocument` de `shared/types/marketing.ts`. Les quatre sont liées depuis la colonne « Légal » du footer public (et les CGU depuis la case du signup), et référencées au sitemap avec leurs alternates hreflang. L'identité affichée par les mentions légales vient des variables `LEGAL_*` (`config/legal.ts`), pas de l'i18n — voir `docs/dev/mentions-legales.md`
- i18n : textes construits côté serveur depuis `resources/lang/{en,fr}/marketing.json` et passés en prop `t` (namespace exclu de `appT`)
- Composants par page dans `inertia/components/marketing/{home,pricing,about,contact,simulator,guide,diagnosis}/`
- Chat diagnostic IA public (#602) : `diagnosis_ai.vue` (page hybride anonyme/connecté, namespace `publicDiagnosis` au tutoiement, transmis par `appT` contrairement à `marketing`) orchestre `diagnosis/DiagnosisChatPanel.vue` (mutations `router.post` + `preserveScroll` + partial reload `only: ['conversation', 'quota', …]`, message optimiste local pendant l'appel Mistral synchrone), avec `DiagnosisChatMessage`, `DiagnosisChatComposer` (contexte moteur au 1er message), `DiagnosisResultCard` et `DiagnosisQuotaBanner` (2 conversations gratuites, CTA `/signup?from=diagnostic`)
- Mise en avant du diagnostic IA (#609) : le chat public est exposé par un 4ᵉ lien de nav « Diagnostic IA » (`AppHeader.vue` et `AppHeaderMobileDrawer.vue`, `public.nav.diagnosisAi`, href via `marketingPath('diagnosisAi', locale)` — recalculé en interne dans le drawer, comme `pricingHref`), par `home/HomeDiagnosisSection.vue` (promesse + les trois étapes du diagnostic, CTA vers le **chat public** et non `/signup` : l'entrée sans friction du tunnel) et par l'argumentaire tarifs (ligne du tiers Starter, ligne « Diagnostic de panne public » du comparatif, FAQ « essayer l'IA sans compte »). Les quotas affichés interpolent `PUBLIC_DIAGNOSIS_LIFETIME_LIMIT` dans `MarketingController`, jamais un nombre recopié dans le JSON de traduction (#454)
- Simulateur (#464) : les champs numériques de la première étape vivent dans `simulator/SimulatorBoatDimensionsFields.vue` — ils conservent la saisie **texte** et n'émettent qu'une valeur parsée (`parseDecimalInput` de `shared/helpers/number_format.ts`, qui lit le point comme la virgule), jamais un `Number()` réinjecté dans le champ. Les longueurs affichées passent par `formatLength` (`useNumberFormat()` côté composant, le helper partagé avec locale explicite pour le titre Open Graph de `simulator_share.vue`) : `10,5 m` en FR, `10.5 m` en EN, jamais `{length}m` collé. Le namespace `simulator` est au **tutoiement** comme le reste du marketing
- Prix et compteurs (#465) : un prix affiché passe par `formatPrice` (`useNumberFormat()`, helper partagé `shared/helpers/number_format.ts`) — jamais `{{ price }} €` collé dans le template, sinon la page EN annonce « 20 € » à côté d'un texte disant « €20 ». Concerne `home/HomeModularOfferSection.vue`, `pricing/{PricingModulesSection,PricingConfigurator,PricingConfiguratorModuleCard,PricingDetailedTableSection,PricingROISection}.vue`. Les chiffres animés (`HomeStatValue.vue` → `use_count_up.ts`) regroupent leurs milliers via `Intl.NumberFormat` sur la locale de l'app (`28 240` en FR, `28,240` en EN) et lisent la virgule française comme un séparateur **décimal**
- Mockups d'écran de la home (`home/HomeMock{Dashboard,BoatDetail,Planning,Fleetide,UpcomingTasks}.vue`) : faux screenshots au texte français écrit en dur — ils ne passent pas par `t()` et échappent donc aux relectures i18n, penser à les inclure dans toute passe d'orthographe
- Formulaire de contact (#450) : `contact/ContactFormSection.vue` poste sur `POST /contact` via `useForm` (`preserveScroll`), erreurs VineJS affichées par champ, panneau de confirmation piloté par la prop `contactSent` (flash relu par `MarketingController.contact`) puis par l'état local après `onSuccess`. Barre latérale extraite en `ContactFormSidebar.vue`, pastilles sujet/taille de flotte en `ContactPillGroup.vue`. Les cartes de `ContactChannelsSection.vue` sont des liens : ancre `#contact-form`, `<Link>` `/signup`, `mailto:` support et presse.
- Canvas décoratifs (`inertia/components/marketing/canvas/`, tous `aria-hidden`, cycle de vie via `use_canvas_lifecycle.ts`) :
  - `GradientMeshCanvas.vue` — dégradé WebGL (repli 2D) : heros home (`navy`), tarifs (`sunset`), about (`dawn`)
  - `PortsMapCanvas.vue` — carte pointillée + arcs : `HomeStatsBandSection` (`dark`, bande navy), hero contact (`light`)
  - `ParticleNetworkCanvas.vue` — particules réactives souris : `HomeFinalCtaSection`
- Détail des animations : `inertia/css/ANIMATIONS.md`

### Settings — notifications (`/settings/notifications`, #498)

- Page : `inertia/pages/settings/notifications.vue` → `components/settings/tabs/SettingsNotificationsTab.vue` (prop `pushSubscriptions`, servie par `SettingsController.notifications`), section visible pour **tous les rôles**.
- Gestion du Web Push : activer/désactiver **cet appareil** (`use_push_notifications.ts` — `subscribe()` uniquement sur geste utilisateur), liste des appareils abonnés (`user_agent`, dates) et retrait par appareil (`DELETE /push/subscriptions/:id`). Sur iOS hors PWA installée, `IosInstallHint.vue` remplace le bouton. Détail : `docs/frontend/pwa.md` § Web Push.

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
- **Bottom tab bar mobile** (#492) : `MobileBottomNav.vue` (`lg:hidden`), montée dans le flux du shell **hors du `<main>` scrollable** — jamais en `fixed`, donc aucun contenu recouvert — avec `pb-[env(safe-area-inset-bottom)]` pour l'indicateur home iOS (#484). 4 raccourcis max par rôle via `bottomNavItems` (`use_nav_sections.ts`, mêmes capabilities que la nav complète) : `mechanic` → Dashboard/Planning/Historique/Bateaux ; `admin`/`member` → Dashboard/Bateaux/Planning/Réservations ; `boat_owner` → barre masquée. Le drawer `MobileSidebarDrawer.vue` reste la navigation exhaustive — les deux coexistent.
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

Deux boutons d'upload (#485) : « Ajouter » ouvre le sélecteur (input `multiple`) et
« Prendre une photo » ouvre l'appareil photo via un **second input** `capture="environment"`
sans `multiple` — `capture` sur l'input principal supprimerait la sélection multiple sur
iOS/Android. Même montage dans `BoatPhotoGallery.vue` (fiche bateau).

Consommateurs : `InspectionPhotos.vue` (wrapper fin), et les onglets « Photos » des six équipements —
`EngineShowTabPhotos`, `EnginePartShowTabPhotos`, `SailShowTabPhotos`, `RigShowTabPhotos`,
`GenericShowTabPhotos`, `SafetyShowTabPhotos`.

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

L'information y est hiérarchisée (trajet/date d'abord, champs secondaires ensuite), pas transposée
colonne à colonne. Non-régression : `tests/inertia/table_card_collapse.spec.ts` (mêmes données que
les lignes + classes de breakpoint), débordement horizontal couvert par #500.

## Patterns UI (forms)

Le projet utilise le composant `<Form>` fourni par `@adonisjs/inertia/vue`.

Exemple: `BoatShowTabTasks.vue` / `BoatShowTabHistory.vue` contiennent:

- create task/event
- mark done
- delete task/event
