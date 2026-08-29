# Corpus du catalogue de bateaux (#571)

Un fichier par catégorie, agrégé par `index.ts` et inséré par
`database/seeders/boat_catalog_seeder.ts`.

## Règles de saisie

- **`name` = nom commercial officiel**, accents et casse compris (`Bénéteau`, `Sea-Doo`,
  `X-Yachts`). C'est un **identifiant de recherche** : il n'est pas traduit et ne passe jamais par
  `t()`.
- **`slug` = kebab-case sans accent, stable à vie** (`beneteau`, `fountaine-pajot`, `sea-doo`). Il
  est **persisté** : on peut insérer un slug à n'importe quelle position, jamais le renommer. Le
  slug d'un modèle est dérivé de son nom par `slugifyCatalogName()` — ne le fournir explicitement
  que si le nom doit changer sans que le slug bouge.
- **`aliases`** couvre les orthographes réellement rencontrées et les anciens noms (`beneteau`,
  `benetau`, `Chantiers Bénéteau`). C'est ce qui permet à `BoatCatalogService.resolveBrand()` de
  rattacher une saisie libre.
- Une marque peut appartenir à **plusieurs catégories** (Bénéteau : `sailboat_monohull` +
  `motor_yacht` + `trawler`), un modèle à **une seule**. Une marque n'est déclarée qu'**une fois**,
  dans le fichier de sa catégorie principale ; ses modèles sont groupés par catégorie dans `models`.
- Les **gammes discontinuées sont conservées** — un bateau de 1987 doit trouver son modèle.
  `productionStartYear` / `productionEndYear` ne sont renseignés que lorsque la date est
  **certaine** : un millésime approximatif en base vaut moins qu'un champ vide.

## Exhaustivité

L'exhaustivité est un objectif continu, pas un prérequis de merge. Les valeurs saisies hors
catalogue par les utilisateurs servent de file d'attente d'enrichissement : le formulaire les
accepte telles quelles, c'est l'invariant du lot.

## Ajouter une marque

1. La déclarer dans le fichier de sa catégorie principale, avec toutes ses `categories`.
2. Grouper ses modèles par catégorie dans `models`.
3. Rien d'autre : `index.ts` agrège et refuse les slugs en double, le seeder est idempotent
   (`updateOrCreate`, jamais de `delete`).
