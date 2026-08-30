# Corpus du catalogue moteur (#573)

Un fichier par famille de motorisation, agrégé par `index.ts` et inséré par
`database/seeders/engine_catalog_seeder.ts`.

## Règles de saisie

- **`name` = nom commercial officiel**, casse et accents compris (`Volvo Penta`, `MerCruiser`,
  `ePropulsion`). C'est un **identifiant de recherche** : il n'est pas traduit et ne passe jamais
  par `t()`.
- **`slug` = kebab-case sans accent, stable à vie** (`volvo-penta`, `johnson-evinrude`). Il est
  **persisté** : on peut insérer un slug à n'importe quelle position, jamais le renommer. Le slug
  d'un modèle est dérivé de son nom par `slugifyCatalogName()` — ne le fournir explicitement que
  si le nom doit changer sans que le slug bouge.
- **`modelCode` = le code tel qu'il figure sur la plaque signalétique** (`6E0`, `J50PLEA`,
  `D2-40`), jamais une reconstitution. C'est celui que l'identification des pièces détachées
  (#517) exploite. Dans le doute, laisser vide. Chez les motoristes dont le nom commercial **est**
  le code plaque (`D2-40`, `3YM30`), le déclarer une fois pour toutes avec `modelCodeFromName: true`
  au niveau de la marque plutôt que de recopier la chaîne sur chaque modèle. Les hors-bord japonais
  sont le cas inverse : leur préfixe à trois caractères ne se déduit pas du nom commercial, la
  colonne reste donc vide.
- **`aliases`** couvre les orthographes réellement rencontrées et les anciens noms (`volvo`,
  `volvo penta`, `VP`). C'est ce qui permet à `EngineCatalogService.resolveBrand()` de rattacher
  une saisie libre. Un alias doit rester **non ambigu** : `yamaha` désigne le motoriste hors-bord,
  pas la gamme jet, dont les alias sont `yamaha jet` et `yamaha marine jet`.
- Une marque peut couvrir **plusieurs familles** (Volvo Penta : `inboard_diesel` +
  `inboard_petrol`), un modèle une seule. Une marque n'est déclarée qu'**une fois**, dans le
  fichier de sa famille principale ; ses modèles sont groupés par famille dans `models`.
- **`modelDefaults`** porte le cycle et le carburant communs à toute la marque (un hors-bord
  thermique moderne est 4 temps à essence). Un modèle qui les précise l'emporte.
- Les **gammes discontinuées sont conservées** — un Yamaha 4AS de 1998 doit trouver son modèle.
  `productionStartYear` / `productionEndYear` ne sont renseignés que lorsque la date est
  **certaine** : un millésime approximatif en base vaut moins qu'un champ vide. Même règle pour
  `displacementCc` et `cylinders`.

## Puissance

`powerHp` est renseigné quand il est **porté par le nom commercial** (`Yamaha F150` → 150 ch,
`D2-40` → 40 ch), ce qui est le cas courant chez les motoristes marins. Une gamme dont le nom ne
dit rien de la puissance laisse le champ vide plutôt que d'avancer une valeur approximative.

## Exhaustivité

L'exhaustivité est un objectif continu, pas un prérequis de merge. Les valeurs saisies hors
catalogue par les utilisateurs servent de file d'attente d'enrichissement : le formulaire les
accepte telles quelles, c'est l'invariant de l'épic #572.

## Aides plaque et motif de référence (#575)

- **`plateLocationKey` / `plateExampleKey`** : clés i18n de l'aide « où trouver la plaque
  signalétique ». Les ajouter dans `resources/lang/{en,fr}/parts.json` sous
  `parts.identify.plate.<marque>` — un test refuse une clé déclarée ici et absente d'une locale.
  Une marque sans aide n'apparaît simplement pas dans la liste : mieux vaut une liste courte qu'une
  ligne vide.
- **`referencePattern`** : à ne déclarer que pour une marque dont le décodage est **connu et
  documenté**. Chez Yamaha, les 5 chiffres centraux d'une référence identifient la fonction de la
  pièce indépendamment du moteur — le motif vit dans `#shared/helpers/spare_parts`
  (`YAMAHA_REFERENCE_PATTERN`), lu à la fois par le seed et par les écrans. Sans motif, la carte
  « décoder une référence » ne s'affiche pas, ce qui est le bon défaut.

## Références constructeur (`part_references.ts`, #575)

Un fichier à part, une entrée par couple (modèle, pièce). **Règle unique : une entrée sans source
ne se saisit pas** — `sourceLabel` est obligatoire dans le type comme en base (`NOT NULL`), et
`index.ts` refuse au chargement une source vide, une clé de pièce inconnue d'`ALL_SPARE_PART_KEYS`
ou un couple déclaré deux fois.

- `brandSlug` / `modelSlug` désignent une marque et un modèle **existants** : un slug inconnu fait
  échouer le seeder, parce que c'est une faute de frappe, pas une donnée manquante.
- `verifiedAt` ne se renseigne qu'**après recontrôle sur la source citée**. Vide, l'entrée est
  affichée avec la mention « non revérifiée — contrôlez-la avant de commander » ; c'est aussi ce
  qui permet de repérer les entrées à recontrôler.
- Priorité : pièces d'usure (turbines, kits de pompe à eau, filtres, anodes, joints de saildrive,
  courroies) des modèles les plus répandus, puis les modèles déjà présents dans l'app. Une pièce
  sans référence connue affiche l'écran d'avant, liens revendeurs compris — l'exhaustivité n'est
  pas un prérequis.

## Ajouter une marque

1. La déclarer dans le fichier de sa famille principale, avec toutes ses `families`.
2. Grouper ses modèles par famille dans `models`.
3. Rien d'autre : `index.ts` agrège et refuse les slugs en double, le seeder est idempotent
   (`updateOrCreate`, jamais de `delete`).
