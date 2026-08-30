# 2026-08-30 — Voiles : voilerie et matériau normalisés (#578)

Même famille que les catalogues #571/#573/#577, appliquée aux voiles — avec une particularité :
le champ voilerie n'existait pas du tout, et il n'y a **pas de table de modèles** (une voile est
un produit sur mesure).

## Voilerie

- Nouvelle table `sail_lofts` (référentiel global : `slug` unique stable à vie, `name`, `country`,
  `aliases` jsonb, `isActive`) + colonnes `boat_sails.sailmaker` (texte libre, **source de
  vérité**) et `boat_sails.sail_loft_id` (FK nullable, `SET NULL`).
- `SailLoftService` (`listLofts`, `resolveLoft` sur slug/nom/alias + n-grammes, `formProps`) —
  décalque simplifié de `EquipmentCatalogService`, sans catégories ni rechargement partiel.
- Formulaire voile : `sailmaker` en `BaseCombobox` (alias cherchables, saisie libre **toujours
  acceptée**) + champ masqué `sailLoftId`, neutralisé en `null` sur valeur aberrante sans jamais
  faire échouer la saisie. Props `sailLofts`/`sailCatalogLoftId` posées par `boats_controller.show`
  (carte Voiles, modale d'ajout) et `boat_equipment_controller.editSail` (page d'édition), lues
  par le composable `use_sail_lofts`.
- La fiche voile (onglet Informations) et le PDF du carnet d'entretien affichent la voilerie.

## Matériau

- `boat_sails.material` passe du texte libre à l'enum `SAIL_MATERIALS` (`dacron`, `laminate`,
  `hydranet`, `membrane`, `nylon_spi`, `cuben`, `other`) : `vine.enum` tolérant au vide sur store
  **et** update, `SAIL_MATERIAL_OPTIONS`, `sailMaterialOptions`, clés
  `boats.options.sailMaterial.*` dans les deux locales.
- Le formulaire passe d'un champ texte à un `BaseSelect` avec option vide (« je ne sais pas »).
- Affichages traduits avec repli sur la valeur brute pour les enregistrements legacy
  (`sailMaterialLabel`) : carte Voiles, onglet Informations, PDF (section Voilure et inventaire).
  `buildSailCaption()` écrit le libellé de repli EN dans les captions stockés au lieu du slug.

## Migrations

- `1843000000000_create_sail_lofts_table` et `1843000001000_alter_boat_sails_add_sailmaker_and_sail_loft_id`
  (avec `down()`).
- `1843000002000_normalize_boat_sails_material` : normalisation best-effort des valeurs libres
  existantes via `normalizeSailMaterial()` (`shared/helpers/sail_material.ts`, insensible
  casse/accents, motifs du spécifique au générique) ; valeur non mappable → `other` **avec recopie
  de la saisie d'origine dans `notes`** — aucune information perdue.

## Seeder et déploiement

- `sail_loft_seeder.ts`, idempotent (`updateOrCreate` sur le slug, jamais de delete), corpus de
  42 voileries avec alias dans `database/data/sail_lofts/` ; branché sur `migrate:prod`
  (package.json) et le service `migrator` (docker-compose.prod.yml).

## Correctifs au passage

- Les deux labels en dur `Material` et `Area (m²)` de `BoatEquipmentSailFields.vue` passent par
  `t()` (`boats.sailFields.*`, deux locales).
- `BoatSailService.create()` ignorait `notes` (seul `update()` le gérait) : les notes saisies à la
  création d'une voile sont désormais persistées.
- `boat_sail_factory.ts` produisait des valeurs hors enum (`mainsail`, `good`, `nylon`) —
  alignées sur les vocabulaires réels.

## Tests

- Japa : `tests/unit/helpers/sail_material.spec.ts` (normalisation, priorités des motifs, note
  legacy), `tests/functional/boats/sail_lofts.spec.ts` (service, validators, persistance HTTP,
  `SET NULL`, idempotence du seeder).
- Vitest : `sail_material_i18n.spec.ts` (clés dans les deux locales, parité options/constante),
  `boat_equipment_sail_fields.spec.ts` (select fermé, combobox, rattachement posé/relâché),
  ajouts à `use_boat_options.spec.ts` et `boat_enum_labels.spec.ts`.
