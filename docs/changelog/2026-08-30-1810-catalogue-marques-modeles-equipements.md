# 2026-08-30 — Catalogue de marques et modèles d'équipements génériques (#577)

Même famille que les catalogues bateaux (#571) et moteurs (#573), appliquée aux équipements
génériques (`boat_generic_equipment`) : les champs `brand`/`model` restent du texte libre qui fait
foi, mais une combobox propose désormais un corpus de **127 marques** (électronique, VHF,
mouillage, accastillage, électricité, énergie, confort, plomberie) et **423 modèles**, concentrés
sur l'électronique où le modèle précis compte pour le SAV.

- **Tables.** `equipment_brands` (`slug` unique stable, `name`, `country`, `categories` jsonb,
  `aliases` jsonb, `is_active`) et `equipment_models` (FK `equipment_brand_id` en cascade, `slug`
  unique par marque, `category`, années de production, `aliases`). Migrations `1842…` avec
  `down()` implémenté.
- **Rattachement.** `boat_generic_equipment.equipment_model_id` (FK nullable, `SET NULL`) :
  `brand`/`model` restent alimentés en repli texte libre — invariant commun à toute la série,
  aucune donnée existante invalidée. Une valeur aberrante du champ caché se neutralise en `null`
  sans faire échouer la saisie.
- **Service.** `app/services/equipment_catalog_service.ts` : `listBrands({ category, q })`
  (la catégorie **priorise**, ne filtre jamais), `listModels({ brandId, q })`,
  `resolveBrand(saisieLibre)` sur slug + nom + alias (égalité stricte puis n-grammes — `waeco` →
  Dometic, `frigo Indel Webasto` → Isotherm), `formProps()` pour les props Inertia.
- **Seeder.** `equipment_catalog_seeder.ts`, idempotent (`updateOrCreate` sur le slug, jamais de
  `delete`), données dans `database/data/equipment_catalog/` (un fichier par catégorie + README),
  branché sur le déploiement (`docker-compose.prod.yml`, `migrate:prod`) à côté des catalogues
  bateaux et moteurs. Les groupes électrogènes ne sont pas dupliqués : ils restent au catalogue
  moteur (famille `generator`).
- **Catégories étendues.** `GENERIC_EQUIPMENT_CATEGORIES` gagne `energy` (éolienne,
  hydrogénérateur, chauffage), `comfort` (frigo, réchaud, dessalinisateur) et `plumbing` (pompes,
  WC marin, chauffe-eau). Options partagées `GENERIC_EQUIPMENT_CATEGORY_OPTIONS` ajoutées à
  `boat_form_options.ts`, i18n dans les deux locales (`boats.options.genericEquipmentCategory.*`,
  `boats.equipmentAddModal.categories.*`).
- **Catégorie éditable.** Le champ caché de l'édition d'un équipement devient un vrai select : un
  guindeau créé par erreur en `deck` se corrige sans supprimer/recréer. Le littéral dupliqué de
  `BoatEquipmentAddModal.vue` est remplacé par la constante partagée.
- **UI.** `BoatGenericEquipmentIdentityFields.vue` (décalque de `BoatEngineIdentityFields`) :
  comboboxes marque/modèle avec alias en mots-clés de recherche, marques de la catégorie de
  l'équipement remontées en tête sans jamais filtrer, saisie libre toujours acceptée. Modèles
  chargés par `router.reload({ only: ['equipmentCatalogModels'], data: { equipmentBrandId } })` —
  aucun `fetch`/`axios`. Brouillon `useGenericEquipmentFormDraft` + réouverture des modales par
  l'URL (`equipmentForm=…`) le temps de l'aller-retour catalogue.
- **Validator.** `maxLength(120)` sur `brand`/`model` et `maxLength(5000)` sur `notes`, alignés
  sur `boat_equipment.ts`.
- **i18n unifiée.** Une seule forme `equipment.purchasePrice.label` / `purchasedAt.label` /
  `notes.label` — les usages « nus » de `GenericShowTabInfo`, `SafetyShowTabInfo`,
  `SailShowTabInfo` et `RigShowTabInfo` (qui affichaient la clé brute) sont corrigés, et la liste
  `KNOWN_UNRESOLVED` du test de namespaces purgée.
- **Tests.** Japa : service (priorisation, alias, n-grammes, formProps), validators (saisie hors
  catalogue toujours acceptée, plafonds, nouvelles catégories), édition de catégorie en HTTP,
  `SET NULL` au retrait d'un modèle, idempotence et volumes du seeder (≥ 120 marques, toutes les
  catégories couvertes). Vitest : combobox marque/modèle (rattachement, invalidation, visite
  partielle, priorisation par catégorie) et complétude i18n des catégories dans les deux locales.
- **Docs.** `docs/data/schema.md` : sections `equipment_brands`, `equipment_models`,
  `boat_generic_equipment`.
