# Corpus du catalogue d'équipements (#577)

Un fichier par catégorie d'équipement générique (`GENERIC_EQUIPMENT_CATEGORIES`), agrégé par
`index.ts` et inséré par `database/seeders/equipment_catalog_seeder.ts`. Les règles sont celles du
catalogue moteur (`database/data/engine_catalog/README.md`) — seules les particularités sont
rappelées ici.

## Règles de saisie

- **`name` = nom commercial officiel**, casse et accents compris (`B&G`, `ePropulsion`,
  `Eberspächer`). C'est un **identifiant de recherche** : il n'est pas traduit et ne passe jamais
  par `t()`.
- **`slug` = kebab-case sans accent, stable à vie** (`standard-horizon`, `watt-and-sea`). Il est
  **persisté** : on peut insérer un slug à n'importe quelle position, jamais le renommer.
- **`aliases`** couvre les orthographes réellement rencontrées et les anciens noms (`waeco` pour
  Dometic, `autohelm` pour Raymarine, `marlec` pour Rutland). C'est ce qui permet à
  `EquipmentCatalogService.resolveBrand()` de rattacher une saisie libre.
- Une marque peut couvrir **plusieurs catégories** (Lewmar : mouillage + accastillage, Quick :
  mouillage + électricité + plomberie), un modèle une seule. Une marque n'est déclarée qu'**une
  fois**, dans le fichier de sa catégorie principale ; ses modèles sont groupés par catégorie dans
  `models`.
- Les **gammes discontinuées sont conservées** — un pilote Autohelm des années 90 doit trouver sa
  marque. `productionStartYear` / `productionEndYear` ne sont renseignés que lorsque la date est
  **certaine**.

## Modèles

Le corpus v1 concentre les modèles sur l'**électronique** (traceurs, VHF, AIS, pilotes,
régulateurs de charge), là où le modèle précis compte pour le SAV et les mises à jour logicielles.
Pour l'accastillage ou la plomberie, la marque seule suffit souvent — une marque sans modèle est
une entrée parfaitement valide.

## Groupes électrogènes

Les groupes (Fischer Panda, Onan, Paguro…) sont déjà couverts par le **catalogue moteur** (#573,
famille `generator`) : un groupe se saisit comme un moteur dans l'app. Ils ne sont pas dupliqués
ici ; la catégorie `energy` couvre l'éolien, l'hydrogénérateur et le chauffage.

## Exhaustivité

L'exhaustivité est un objectif continu, pas un prérequis de merge. Les valeurs saisies hors
catalogue par les utilisateurs servent de file d'attente d'enrichissement : le formulaire les
accepte telles quelles, c'est l'invariant de la série (#571, #573, #577).
