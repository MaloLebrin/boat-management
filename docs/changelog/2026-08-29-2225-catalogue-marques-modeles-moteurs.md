# 2026-08-29 — Catalogue de marques et modèles moteurs, saisie assistée (#573)

`boat_engines.brand` et `boat_engines.model` étaient du texte libre sans aucune liste de référence.
La seule normalisation existante était une cascade de trois `if` codée en dur dans
`resolveSparePartsBrand()` (`shared/helpers/spare_parts.ts`) : elle ne connaissait que Yamaha,
Johnson/Evinrude et Mercury/Mariner, et renvoyait `null` pour tout le reste — un Honda ou un Volvo
Penta n'était rattachable à rien. Le code modèle était déjà exploité, mais deviné
(`yamahaReferenceExample()` testait `/^[0-9a-z]{2,4}$/i` sur le champ `model`), et le nom du CSV
d'export du panier de réparation était construit directement sur `[engine.brand, engine.model]`,
donc exposé aux fautes de frappe. Aucun seeder ne renseignait `strokeType`, alors que le diagnostic
en dépend.

Sous-issue 1/4 de l'épic #572, miroir du catalogue de bateaux (#571).

**Invariant tenu de bout en bout : le repli texte libre.** `brand` et `model` restent en base et
restent alimentés, aucun moteur existant ne devient invalide, aucune saisie hors catalogue n'est
refusée ni réécrite — la combobox propose, elle ne contraint jamais.

## Catalogue

- **Persistance.** `engine_brands` (`slug` unique et stable à vie, `name`, `country`, `families` et
  `aliases` en `jsonb`, `is_active`) et `engine_models` (`engine_brand_id` en cascade, `slug` unique
  par marque, `name`, `model_code`, `family`, `power_hp`, `displacement_cc`, `cylinders`,
  `stroke_type`, `fuel`, années de production, `aliases`). `boat_engines.engine_model_id` est
  **nullable** et en `ON DELETE SET NULL` : retirer un modèle du corpus ne fait perdre aucune
  saisie. `down()` implémenté sur les trois migrations, aucun backfill — le rattachement rétroactif
  des valeurs déjà saisies est hors périmètre.
- **Familles.** Nouveau vocabulaire fermé `ENGINE_FAMILIES` (`shared/types/engine_catalog.ts`) :
  `outboard_thermal`, `outboard_electric`, `inboard_diesel`, `inboard_petrol`, `jet`, `generator`.
  À ne pas confondre avec `kind`, saisi sur le moteur lui-même. La nomenclature fine des familles
  et des pièces reste le sujet de la sous-issue 2/4.
- **Service.** `EngineCatalogService` (`listBrands`, `listModels`, `resolveBrand`, `formProps`) —
  aucune requête Lucid dans un contrôleur. La famille **priorise** les marques, elle ne les filtre
  jamais.
- **Corpus v1.** **71 marques et 1 041 modèles**, répartis sur les six familles :
  hors-bord thermiques (Yamaha, Mercury/Mariner, Suzuki, Honda, Tohatsu, Johnson/Evinrude, Selva…),
  hors-bord et propulsion électriques (Torqeedo, ePropulsion, Mercury Avator, Oceanvolt…), in-bord
  diesel (Volvo Penta, Yanmar, Nanni, Vetus, Beta Marine, Solé, Perkins, Cummins, MAN, Scania…),
  in-bord essence et embase Z (MerCruiser, Crusader, Indmar, PCM…), jet (Rotax, Kawasaki,
  HamiltonJet, Castoldi…) et groupes électrogènes (Onan, Fischer Panda, Mase, Paguro…). Les gammes
  discontinuées sont conservées : le Yamaha 4AS de 1998 déjà seedé par `malo_seeder.ts` trouve son
  modèle.
- **Seeder.** `engine_catalog_seeder.ts`, **idempotent** (`updateOrCreate` sur le slug, jamais de
  `delete`), sans `static environment` : il alimente un référentiel métier, pas des données de démo,
  et s'enchaîne derrière le `migration:run --force` du service `migrator` (`pnpm migrate:prod`).

## Rapprochement d'une saisie libre

`EngineCatalogService.resolveBrand()` **remplace** `resolveSparePartsBrand()`. La résolution se fait
en deux passes sur le `slug`, le `name` et les `aliases` en base : égalité stricte d'abord (ce que
fait déjà `BoatCatalogService`, seul capable de rattacher un alias qui n'est pas un mot de la saisie
comme `VP` → Volvo Penta), puis groupes de mots consécutifs du plus long au plus court, ce qui
retrouve une marque noyée dans une saisie plus large (`EVINRUDE 6cv`, `Volvo Penta D2-40`) sans les
faux positifs d'un `includes` brut sur un slug court comme `omc`. `Mercury MerCruiser 5.7` tombe
bien sur MerCruiser et non sur Mercury.

**Côté pièces détachées (#517), la résolution passe désormais côté serveur** : `resolveBrand()`
interroge la base, un composant Vue ne peut pas l'appeler. Le contrôleur expose un
`catalogBrandSlug` déjà résolu, et les écrans (`SparePartsRetailerLinks`,
`SparePartsIdentitySection`, `spare_parts/assembly`) le traduisent avec le helper pur
`sparePartsBrandFromCatalogSlug()`, qui ne fait plus que la **couverture** du corpus de pièces.
Comportement inchangé : un Honda est bien résolu comme marque du catalogue, mais renvoie toujours
`null` côté pièces — les écrans retombent sur `GENERIC_RETAILERS` et les aides plaque de toutes les
marques.

## Formulaire

- `brand` et `model` passent en `BaseCombobox` dans un nouveau
  `BoatEngineIdentityFields.vue`, extrait de `BoatEquipmentEngineFields.vue` pour rester sous la
  limite ESLint `max-lines`. Les deux champs restent des `input[name]` natifs, sérialisés par le
  `<Form>` Inertia — une saisie hors catalogue part telle quelle.
- Le choix d'une marque recharge ses modèles par
  `router.reload({ only: ['engineCatalogModels', 'engineCatalogBrandId'], data: { engineBrandId }, preserveScroll: true })` :
  **aucun `fetch`, aucun `axios`, aucun CSRF manuel, aucune route `/api` nouvelle**.
- Le choix d'un modèle **pré-remplit `powerHp`, `fuel` et `strokeType` uniquement s'ils sont vides**.
  Une valeur déjà saisie — y compris héritée du moteur en cours d'édition — n'est jamais écrasée.
- Retaper la marque ou le modèle à la main relâche le rattachement `engineModelId` : la clé
  étrangère ne survit jamais à une saisie qui diverge.
- Le formulaire est monté depuis trois écrans, à quatre niveaux sous la fiche bateau : le catalogue
  est lu dans les props de page via le composable `useEngineCatalog()` plutôt que passé de main en
  main. Sans ces props, le formulaire redevient de la saisie libre.

### La visite partielle remonte l'arbre — et ce qu'il a fallu pour y survivre

Sur cette application, une visite Inertia partielle **remonte le sous-arbre du formulaire**, y
compris avec `preserveState`. Tel quel, le mécanisme prescrit était donc inopérant : au moment
précis où l'utilisateur retenait une marque, tous les champs repartaient de leur valeur serveur — la
marque choisie comprise — et, sur la fiche bateau, la modale se refermait. Vérifié au navigateur,
et **reproductible à l'identique sur le formulaire bateau de #571** : le comportement préexiste à
cette PR, il n'est pas introduit ici.

Deux garde-fous, tous deux dans `inertia/composables/use_engine_form_draft.ts` :

- `useEngineFormDraft()` range la saisie en cours dans l'historique Inertia (`useRemember`), le seul
  état qui survive au remontage — et neutre côté SSR. Le brouillon n'est restauré que lorsque l'URL
  porte le paramètre que le formulaire y a lui-même posé : une première ouverture, ou la
  réouverture de la modale après un enregistrement, repart toujours des valeurs serveur, jamais
  d'un brouillon abandonné.
- `shouldReopenEngineForm()` fait rouvrir la modale depuis l'URL, pour les deux écrans qui montent
  le formulaire dans une modale. L'URL est le seul état qui traverse la visite : le formulaire y
  inscrit sa surface d'origine (`engineForm`), la modale s'y reconnaît.

`engineCatalogBrandId` fait partie du rechargement partiel pour la même raison : après le
remontage, c'est le serveur qui réapprend au formulaire quelle marque est retenue.

## i18n

`boats.engines.catalog.*` (placeholders, indices de saisie libre, messages « aucune correspondance »)
et `boats.options.engineFamily.*` (6 familles), dans les deux locales, vouvoiement côté app.

## Tests

- Japa unitaire (`tests/unit/helpers/engine_catalog.spec.ts`) : découpage en mots et n-grammes,
  volumes du corpus (≥ 70 marques, ≥ 900 modèles), couverture des six familles, stabilité et
  unicité des slugs, **absence de clé de rapprochement ambiguë** entre deux marques, cohérence des
  vocabulaires `family` / `fuel` / `strokeType`, conservation du Yamaha 4AS.
- Japa fonctionnel (`tests/functional/boats/engine_catalog.spec.ts`) : `listBrands` (priorisation
  sans filtrage, exclusion des inactives, recherche), `listModels`, `resolveBrand` (dont les trois
  cas historiques de #517 et la correspondance la plus spécifique), `formProps`, validators
  (saisie libre toujours acceptée, rattachement aberrant neutralisé sans échec), idempotence du
  seeder rejoué avec une marque hors corpus insérée entre les deux passages.
- Vitest : `boat_engine_identity_fields.spec.ts` (champs natifs, rechargement partiel,
  invalidation du rattachement, saisie libre), `boat_equipment_engine_fields.spec.ts`
  (pré-remplissage non destructif, repli en saisie libre sans catalogue) et
  `use_engine_form_draft.spec.ts` (brouillon restauré au retour du catalogue, ignoré sinon).
  `spare_parts_content.spec.ts` bascule sur `sparePartsBrandFromCatalogSlug()`.
- Parcours vérifié au navigateur sur les trois écrans : édition d'un moteur existant, modale
  d'ajout depuis la fiche bateau (marque, modèle, pré-remplissage, champs saisis avant le choix de
  la marque tous conservés), enregistrement d'une saisie hors catalogue telle quelle, écrans pièces
  détachées inchangés, thèmes clair et sombre.
