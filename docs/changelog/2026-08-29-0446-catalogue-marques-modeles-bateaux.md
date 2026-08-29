# 2026-08-29 — Catalogue de marques et modèles par catégorie, saisie assistée (#571)

L'identité d'un bateau était saisie **entièrement en texte libre**. Aucune notion de catégorie
n'existait : le filtre de la liste reconstruisait ses options à partir des valeurs distinctes de la
page courante, si bien que « Voilier », « voilier » et « Voilier monocoque » donnaient trois filtres
pour la même chose. Les marques cohabitaient sous toutes leurs orthographes (`Bénéteau`,
`Beneteau`, `BENETEAU` — les seeders eux-mêmes alternaient), et rien n'était réutilisable en aval :
le simulateur retombait déjà sur un `SIMULATOR_BOAT_TYPES.includes(boat.type)`, et l'identification
des pièces détachées (#517) avait dû se construire son propre corpus de marques moteur.

**Invariant tenu de bout en bout : le repli texte libre.** Aucun bateau existant ne devient
invalide, et un constructeur rare ou un bateau amateur reste saisissable — la combobox propose, elle
ne contraint jamais.

## Catégories

- **Vocabulaire.** `BOAT_CATEGORIES` dans `shared/types/boat_catalog.ts` — 15 valeurs couvrant le
  parc réel (`sailboat_monohull`, `sailboat_multihull`, `motor_yacht`, `power_catamaran`, `trawler`,
  `open_dayboat`, `fishing`, `rib`, `jetski`, `houseboat`, `dinghy`, `tender`, `classic`,
  `workboat`, `other`). Câblé aux **deux** validators via `vine.enum()`, à
  `BOAT_CATEGORY_OPTIONS` et au `categoryOptions` de `use_boat_options.ts`.
- **Colonne.** `boats.category` (`string`, nullable, **indexée**).
- **Backfill best-effort** dans la migration : normalisation des valeurs de `type` déjà en base
  (`voilier`, `sailboat`, `semi-rigide`, `rib`, `catamaran à moteur`…) puis repli sur
  `propulsion_type`. La table de correspondance vit dans `deriveCategoryFromLegacy()`
  (`shared/helpers/boat_catalog.ts`) et est testée pour elle-même. Quand rien ne permet de trancher,
  la colonne reste vide : **on ne devine pas**.
- **`type` reste en base.** Il n'est simplement plus alimenté par le formulaire ni affiché. Une
  édition ne l'écrase pas — le service ne le touche que s'il est explicitement fourni, sans quoi un
  simple enregistrement aurait effacé la valeur historique.
- **Ne pas confondre** avec `navigation_category` (catégorie CE A/B/C/D), qui n'a aucun rapport :
  clés i18n et libellés distincts.

## Catalogue

- **Tables.** `boat_brands` (slug unique stable à vie, `name`, `country`, `categories` jsonb,
  `aliases` jsonb, `founded_year`, `discontinued_year`, `is_active`) et `boat_models`
  (`boat_brand_id` FK cascade, slug unique par marque, `name`, `category`, `length_m`, années de
  production, `aliases`). Migrations `1833000000000` à `1833000002000`, `down()` implémenté partout,
  aucune migration destructive.
- **Service.** `BoatCatalogService` (`listBrands`, `listModels`, `resolveBrand`) — colonnes
  explicites, aucune requête Lucid dans le controller. `listBrands({ category })` **priorise** la
  catégorie choisie sans jamais s'y limiter : un chantier absent de la catégorie reste proposé.
  `resolveBrand()` rapproche une saisie libre via slug puis alias, sur le modèle de
  `resolveSparePartsBrand()`, et renvoie `null` hors catalogue.
- **Corpus v1.** `database/data/boat_catalog/`, un fichier par catégorie (règles de saisie en tête
  de chaque fichier et dans le `README.md` du dossier) : **328 marques et environ 3 600 modèles**,
  répartis sur les 14 catégories hors `other`. Les slugs sont persistés et ne se renomment jamais.
  Les gammes discontinuées sont conservées — un bateau de 1987 doit trouver son modèle — mais
  `productionStartYear` / `productionEndYear` ne sont renseignés que lorsque la date est certaine :
  un millésime approximatif en base vaut moins qu'un champ vide.
- **Seeder.** `boat_catalog_seeder.ts`, **idempotent** (`updateOrCreate` sur le slug, jamais de
  `delete`) et sans `static environment` : c'est un référentiel métier, pas de la démo. Il est
  enchaîné derrière le `migration:run --force` du service `migrator` de `docker-compose.prod.yml`
  et du script `migrate:prod` (#542). Une marque retirée des fichiers de données, ou ajoutée à la
  main, survit à un second passage.

## Formulaire et liste

- **Formulaire.** Nouveau `BoatFormIdentityFields.vue` (catégorie en select, constructeur et modèle
  en combobox), extrait de `BoatFormHullFields.vue` qui frôlait la limite ESLint `max-lines`. Le
  champ texte `type` disparaît de l'UI.
- **Chargement des modèles.** `BoatsController.create()` / `edit()` passent `brands` (quelques
  centaines d'entrées), et les modèles de la marque retenue arrivent par
  `router.reload({ only: ['catalogModels'], data: { brandId } })` — une visite Inertia partielle,
  **aucun `fetch`/`axios`, aucun CSRF manuel, aucune route `/api` nouvelle**. À l'édition, le
  serveur rapproche lui-même le `manufacturer` déjà saisi via `resolveBrand()`, pour que la liste
  soit utile dès l'ouverture sans aller-retour supplémentaire.
- **`BaseCombobox.vue`.** Nouveau composant `base` : navigation clavier (↑ ↓ Entrée Échap),
  `role="combobox"` / `aria-expanded` / `aria-controls` / `aria-activedescendant`, listbox et
  options ARIA, filtrage insensible à la casse et aux accents (« bene » remonte « Bénéteau »).
  Tokens sémantiques uniquement, rendu dans `/design-system`. Entrée sans option surlignée laisse
  passer la saisie libre.
- **Liste.** Le filtre passe de `?type=` à `?category=`, avec les libellés traduits de l'enum au
  lieu des valeurs distinctes de la page. Colonne du tableau, badge des cartes, en-tête et onglet
  Caractéristiques de la fiche affichent la catégorie traduite (`boatCategoryLabel`, repli sur la
  valeur brute pour une catégorie inconnue).

## i18n

`boats.options.category.*` (15 clés), `boats.catalog.*` (placeholders, aides et messages de repli
qui rappellent qu'une saisie hors catalogue est conservée), `boats.hullFields.category`,
`boats.list.category`, `common.noResults` — en `fr` et en `en`, vouvoiement côté app.

## Tests

- **Japa.** `deriveCategoryFromLegacy` / `slugifyCatalogName` / `normalizeCatalogText` et les
  invariants du corpus (volumes, couverture des catégories, unicité et stabilité des slugs) en
  unitaire ; `BoatCatalogService` (priorisation par catégorie sans filtrage, modèles par marque,
  `resolveBrand` sur `Beneteau` / `BENETEAU` / `bénéteau` / `Chantiers Bénéteau`), les deux
  validators (catégorie valide acceptée, inconnue rejetée, `manufacturer` / `model` libres toujours
  acceptés, bateau sans catégorie toujours valide) et l'idempotence du seeder en fonctionnel.
- **Vitest.** `BaseCombobox` (ARIA, filtrage, clavier, saisie libre émise telle quelle) et
  `BoatFormIdentityFields` (priorisation, visite partielle au choix d'une marque, invalidation des
  modèles quand le constructeur change).
