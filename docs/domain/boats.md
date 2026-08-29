# Domaine — Boats & equipment

## Objectif fonctionnel

Gérer une flotte de bateaux au sein d’une **organisation**:

- créer / lister / afficher / modifier / supprimer un boat
- gérer l’équipement associé:
  - moteurs (engines)
  - voiles (sails)
  - gréement (rig)

## ACL (qui a le droit ?)

Référence: `app/abilities/main.ts`.

- `boatCreate`: user doit appartenir à une org (`organizationId != null`)
- `boatView`, `boatUpdate`, `boatDelete`: user et boat dans la **même org**

## Routes → controllers → pages (Inertia)

Référence routes: `start/routes/boats.ts`.

### Boats

- `GET /boats` (`boats.index`)
  - Controller: `app/controllers/boats_controller.ts` → `index`
  - Service: `app/services/boat_service.ts` → `listForUser`
  - Page: `inertia/pages/boats/index.vue`
  - Filtres: `?q=`, `?category=` (vocabulaire fermé `BOAT_CATEGORIES`, #571 — remplace `?type=`),
    `?propulsionType=`, `?sort=`, `?direction=`. Une `category` hors enum est ignorée.
- `GET /boats/new` (`boats.create`)
  - Controller: `BoatsController.create`
  - ACL: `bouncer.authorize('boatCreate')`
  - Page: `inertia/pages/boats/new.vue`
  - Props catalogue (#571) : `brands` (`BoatCatalogService.listBrands`), `catalogModels` et
    `catalogBrandId`. `?brandId=` recharge `catalogModels` par visite Inertia partielle — pas de
    route `/api`, pas de `fetch`.
- `POST /boats` (`boats.store`)
  - Controller: `BoatsController.store` (validator `createBoatValidator`)
  - Service: `BoatService.createForUser`
  - Redirect: `/boats/:id`
- `GET /boats/:id` (`boats.show`)
  - Controller: `BoatsController.show`
  - Services:
    - `BoatService.getForUserOrFail`
    - `BoatMaintenanceService.listForBoat`
    - `BoatMaintenanceTaskService.listForBoat`
  - Props différées (#463) : la visite initiale ne renvoie que le **squelette**
    (`toShowShellProps` — bateau, photos, position, droits, tarifs, `initialTab`).
    Les données d'onglet sont chargées ensuite par `inertia.defer(…, groupe)`,
    en deux groupes parallèles :
    - `maintenance` : `maintenanceEvents`, `maintenanceTasks`, `maintenanceSheets`,
      `boatDocuments`, `equipmentActions`, `aiSuggestions`
    - `navigation` : `navigationLogs`, `fuelLogs`, `incidents`, `portOptions`,
      `crewMemberOptions`
  - `initialTab` : valeur brute du `?tab=`, résolue côté serveur pour que le SSR
    rende directement le bon onglet (sinon flash d'Aperçu à l'hydratation)
  - Page: `inertia/pages/boats/show.vue`
  - Composants:
    - `inertia/components/boats/hull/BoatShowSpecsCard.vue`
    - `inertia/components/boats/engine/BoatShowEnginesCard.vue`
    - `inertia/components/boats/sail/BoatShowSailsCard.vue`
    - `inertia/components/boats/rig/BoatShowRigCard.vue`
    - `inertia/components/boats/show/tabs/BoatShowTabTasks.vue`
    - `inertia/components/boats/show/tabs/BoatShowTabHistory.vue`
- `GET /boats/:id/edit` (`boats.edit`)
  - Controller: `BoatsController.edit`
  - Page: `inertia/pages/boats/edit.vue`
- `PUT /boats/:id` (`boats.update`)
  - Controller: `BoatsController.update` (validator `updateBoatValidator`)
  - Service: `BoatService.updateForUser`
  - Redirect: `/boats/:id`
- `DELETE /boats/:id` (`boats.destroy`)
  - Controller: `BoatsController.destroy`
  - Service: `BoatService.deleteForUser`
  - Redirect: `/boats`

### Equipment (engines/sails/rig)

Référence: `app/controllers/boat_equipment_controller.ts` et `app/services/boat_service.ts`.

- **Engines**
  - `POST /boats/:boatId/engines` → `BoatEquipmentController.storeEngine`
    - Service: `BoatService.createEngine`
  - `GET /boats/:boatId/engines/:engineId/edit` → `BoatEquipmentController.editEngine`
    - Page: `inertia/pages/boats/engine_edit.vue`
  - `PUT /boats/:boatId/engines/:engineId` → `BoatEquipmentController.updateEngine`
    - Service: `BoatService.updateEngine`
  - `DELETE /boats/:boatId/engines/:engineId` → `BoatEquipmentController.destroyEngine`
    - Service: `BoatService.deleteEngine`
- **Sails**
  - `POST /boats/:boatId/sails` → `storeSail` (create)
  - `GET /boats/:boatId/sails/:sailId/edit` → `editSail`
    - Page: `inertia/pages/boats/sail_edit.vue`
  - `PUT /boats/:boatId/sails/:sailId` → `updateSail`
  - `DELETE /boats/:boatId/sails/:sailId` → `destroySail`
- **Rig**
  - `GET /boats/:boatId/rig/edit` → `editRig`
    - Page: `inertia/pages/boats/rig_edit.vue`
  - `PUT /boats/:boatId/rig` → `upsertRig` (create or update)
    - Service: `BoatService.upsertRig`
  - `DELETE /boats/:boatId/rig` → `destroyRig`
    - Service: `BoatService.deleteRig`

### Budget

Référence: `app/controllers/budget_controller.ts`, `app/services/budget_service.ts`.

- `GET /boats/:id/budget` (`boats.budget.show`)
  - Controller: `BudgetController.show` (validator `budgetYearValidator` pour `?year=`)
  - Services: `BudgetService.getForBoat`, `BoatPortStayService.listForBoat`, `BoatBudgetEntryService.listForBoat`
  - Page: `inertia/pages/boats/budget.vue`
  - Props: `boat`, `budget` (totaux + mensuel), `year`, `portStays`, `entries`, `canManage`

### Port stays

Référence: `app/controllers/boat_port_stay_controller.ts`, `app/services/boat_port_stay_service.ts`.

- `POST /boats/:id/port-stays` → `BoatPortStayController.store`
  - Validator: `boatPortStayValidator`
  - Service: `BoatPortStayService.create`
- `DELETE /boats/:id/port-stays/:stayId` → `BoatPortStayController.destroy`
  - Service: `BoatPortStayService.delete`

### Budget entries (dépenses libres)

Référence: `app/controllers/boat_budget_entry_controller.ts`, `app/services/boat_budget_entry_service.ts`.

- `POST /boats/:id/budget/entries` → `BoatBudgetEntryController.store`
  - Validator: `budgetEntryValidator`
  - Service: `BoatBudgetEntryService.create`
  - Catégories: `maintenance | fuel | documents | port | equipment | other`
- `DELETE /boats/:id/budget/entries/:entryId` → `BoatBudgetEntryController.destroy`
  - Service: `BoatBudgetEntryService.delete`

## Règles métier notables

Référence: `app/services/boat_service.ts`.

- Si `propulsionType === 'sailboat'`, alors `mastHeightM` est requis (create + update).

### Catalogue de marques et modèles (#571)

Référence : `app/services/boat_catalog_service.ts`, corpus dans `database/data/boat_catalog/`.

- **La saisie libre reste acceptée, toujours.** `manufacturer` et `model` sont du texte libre sans
  clé étrangère vers le catalogue : une marque absente est enregistrée telle quelle. C'est
  l'invariant du lot, et les valeurs hors catalogue servent de file d'attente d'enrichissement.
- `listBrands({ category })` **priorise** la catégorie choisie, elle ne la filtre jamais : un
  chantier absent de la catégorie doit rester proposé.
- `resolveBrand(freeText)` rapproche une saisie libre d'une marque via son slug puis ses `aliases`
  (normalisation sans accent ni ponctuation), et renvoie `null` hors catalogue. Utilisé à l'édition
  pour charger d'emblée les modèles du constructeur déjà saisi.
- `boats.category` est un vocabulaire fermé (`BOAT_CATEGORIES`), nullable : un bateau sans catégorie
  reste valide. `boats.type`, le champ texte libre historique, reste en base mais n'est plus
  alimenté par le formulaire — une mise à jour ne l'écrase pas.
- Ne pas confondre avec `navigationCategory` (catégorie CE A/B/C/D).

### Catalogue de marques et modèles moteurs (#573)

Référence : `app/services/engine_catalog_service.ts`, corpus dans `database/data/engine_catalog/`
(un fichier par famille de motorisation). Miroir du catalogue de bateaux ci-dessus.

- **La saisie libre reste acceptée, toujours.** `boat_engines.brand` et `boat_engines.model` restent
  du texte libre et restent alimentés ; `engine_model_id` n'est qu'un rattachement facultatif
  (nullable, `ON DELETE SET NULL`). Un moteur hors catalogue est parfaitement valide, et retirer un
  modèle du corpus ne fait perdre aucune saisie.
- `ENGINE_FAMILIES` (`shared/types/engine_catalog.ts`) : `outboard_thermal`, `outboard_electric`,
  `inboard_diesel`, `inboard_petrol`, `jet`, `generator`. Vocabulaire volontairement grossier — la
  nomenclature fine est le sujet de la sous-issue 2/4. À ne pas confondre avec `kind`, saisi sur le
  moteur lui-même.
- `listBrands({ family })` **priorise** la famille, elle ne la filtre jamais.
- `resolveBrand(freeText)` **remplace** l'ancien `resolveSparePartsBrand()` et sa cascade de trois
  `if`. Résolution en deux passes sur le slug, le nom et les `aliases` en base : égalité stricte
  d'abord (seule capable de rattacher un alias qui n'est pas un mot de la saisie, `VP` → Volvo
  Penta), puis groupes de mots consécutifs du plus long au plus court — ce qui retrouve une marque
  noyée dans une saisie plus large (`EVINRUDE 6cv`, `Volvo Penta D2-40`) sans les faux positifs d'un
  `includes` sur un slug court comme `omc`. `Mercury MerCruiser` tombe sur MerCruiser, pas sur
  Mercury. Renvoie `null` hors catalogue.
- `formProps(rawBrandId, freeTextBrand)` assemble les props du formulaire ; à défaut de `brandId`
  dans l'URL, il rapproche la marque déjà saisie pour que la liste des modèles soit utile dès
  l'ouverture.
- **Pièces détachées (#517)** : `resolveBrand()` interroge la base, un composant Vue ne peut pas
  l'appeler. `BoatEngineSparePartsController.engineProps()` expose donc un `catalogBrandSlug` déjà
  résolu, que les écrans traduisent avec le helper pur `sparePartsBrandFromCatalogSlug()` — lequel
  ne fait plus que la **couverture** du corpus de pièces (trois marques). Un `Honda` est bien résolu
  comme marque du catalogue mais renvoie `null` côté pièces : repli sur `GENERIC_RETAILERS` et les
  aides plaque de toutes les marques, comme avant.
- `model_code` est le code de la **plaque signalétique**, jamais une reconstitution : renseigné
  quand le nom commercial en tient lieu (`D2-40`, `3YM30`), vide chez les hors-bord japonais dont le
  préfixe ne se déduit pas du nom.

### Pavillon et pays (#580)

Référence : `shared/constants/countries.ts`, `shared/helpers/countries.ts`.

- `boats.flagCountry` et `ports.country` partagent un **vocabulaire fermé** : les 249 codes
  ISO 3166-1 alpha-2 de `COUNTRY_CODES`, câblés aux quatre validators via `vine.enum()` et aux
  formulaires via `BaseSelect`. Les deux champs restent nullable.
- Les libellés ne sont **pas** des clés i18n : `countryName(code, locale)` les résout via
  `Intl.DisplayNames` dans la locale de l'app — jamais celle du navigateur, même règle que les
  dates. Une valeur hors liste est rendue **telle quelle**.
- **Aucun enregistrement existant n'est bloqué en édition.** La migration
  `1834000000000_normalize_country_codes` normalise ce qu'elle sait (`France`/`FRA` → `FR`,
  `UK`/`Royaume-Uni` → `GB`) et conserve intact ce qu'elle ne sait pas (`Bretagne`). Le champ étant
  nullable, ne pas renvoyer la valeur legacy ne casse rien ; au prochain enregistrement de la fiche
  le select est vide et la valeur part à `null`.
- `normalizeCountryCode()` est la seule logique de rapprochement (alpha-2, alias hors norme,
  alpha-3, puis noms `fr`/`en`) — la migration n'en est qu'un appelant, comme
  `deriveCategoryFromLegacy` pour les catégories.
