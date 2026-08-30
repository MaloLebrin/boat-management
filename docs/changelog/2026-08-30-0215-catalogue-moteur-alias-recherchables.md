# 30 août 2026 — Marques moteur trouvables sous leurs alias (Mariner, Evinrude, VP…)

## Problème

Dans le formulaire moteur (onglet Équipement d'un bateau), taper « Mariner » ne
remontait aucune marque. Elle est pourtant au catalogue : `mercury-mariner`
porte `mariner` en alias, et `EngineCatalogService.resolveBrand()` sait
rapprocher la saisie à la soumission. Mais la liste, elle, était aveugle :

- `listBrands()` ne sélectionnait pas la colonne `aliases`, et
  `EngineBrandOption` ne la portait pas — les alias ne quittaient jamais le
  serveur ;
- `BaseCombobox` filtre sur le libellé et la valeur, et le libellé est le seul
  `name` de la marque (« Mercury »).

Une marque absorbée par une autre était donc introuvable dans la liste sous son
propre nom, alors même que le serveur savait la reconnaître.

## Changements

### Catalogue

- `database/data/engine_catalog/outboard_thermal.ts` : la marque
  `mercury-mariner` s'appelle désormais **« Mercury / Mariner »**, comme
  « Johnson / Evinrude ». Le slug est inchangé (stable à vie), aucun
  rattachement `boat_engines.engine_model_id` n'est touché.

### Backend

- `EngineBrandOption` (`shared/types/engine_catalog.ts`) porte `aliases: string[]`.
- `EngineCatalogService.listBrands()` sélectionne `aliases` et l'expose
  (tableau vide quand la colonne est `null`).

### Frontend

- `ComboboxOption` accepte `keywords?: readonly string[]` : des termes qui font
  remonter l'option sans jamais s'afficher. Le filtre de `BaseCombobox` les
  parcourt avec le même repliage casse/accents que le libellé.
- `BoatEngineIdentityFields` passe `keywords: b.aliases` sur chaque marque : la
  liste répond maintenant comme `resolveBrand` — `mariner`, `omc`, `merc`,
  `VP`, `e-tec` remontent leur marque.

## Suite à donner

Rejouer le seeder pour appliquer le renommage : `node ace db:seed --files="database/seeders/engine_catalog_seeder.ts"`
(idempotent, `updateOrCreate` sur le slug).

## Tests

- `tests/inertia/base_combobox.spec.ts` : un mot-clé remonte l'option sans
  s'afficher dans le libellé ; une option sans mot-clé n'est pas remontée.
- `tests/inertia/boat_engine_identity_fields.spec.ts` : les alias du catalogue
  descendent bien en `keywords` sur les options de marque.
- `tests/functional/boats/engine_catalog.spec.ts` : `listBrands()` expose les
  alias, et retombe sur `[]` pour une marque qui n'en a pas.
