# Corpus du référentiel des voileries (#578)

Un seul fichier `index.ts`, inséré par `database/seeders/sail_loft_seeder.ts`. Les règles sont
celles des catalogues bateaux/moteurs/équipements (`database/data/engine_catalog/README.md`) —
seules les particularités sont rappelées ici.

## Règles de saisie

- **`name` = nom commercial officiel**, casse et accents compris (`Elvström Sails`,
  `Voilerie Lonné`, `Pinnell & Bax`). C'est un **identifiant de recherche** : il n'est pas traduit
  et ne passe jamais par `t()`.
- **`slug` = kebab-case sans accent, stable à vie** (`elvstrom-sails`, `voilerie-lonne`). Il est
  **persisté** : on peut insérer un slug à n'importe quelle position, jamais le renommer.
- **`aliases`** couvre les orthographes réellement rencontrées et les anciens noms (`elvstrom`,
  `incidences`, `p&b`). C'est ce qui permet à `SailLoftService.resolveLoft()` de rattacher une
  saisie libre.
- **Jamais de suppression** : une voilerie peut être référencée par `boat_sails.sail_loft_id`.
  Une voilerie disparue passe en `isActive: false` — elle sort des propositions du formulaire
  mais reste rattachable et résolvable.

## Pas de modèles

Contrairement aux moteurs (#573) et aux équipements (#577), il n'y a **pas de table de modèles** :
une voile est un produit sur mesure, la notion de modèle n'a pas de sens ici. Le référentiel
s'arrête à la voilerie.

## Exhaustivité

L'exhaustivité est un objectif continu, pas un prérequis : `updateOrCreate` sur le slug permet
d'enrichir le corpus sans redéploiement de données. Les valeurs saisies hors référentiel (champ
`sailmaker` en texte libre) servent de file d'attente d'enrichissement.
