# Catalogue moteurs — implémentation de l'épic #572

> Épic : [#572](https://github.com/MaloLebrin/boat-management/issues/572) — catalogue moteurs
> in-bord et hors-bord, pièces et diagnostic.
> **4 sous-issues / 4 livrées**, en 4 PRs (une par issue) + 3 suivis. Contrairement à l'épic #481,
> toutes les PRs sont déjà mergées séquentiellement sur `main` : ce document résume ce qui a été
> construit et les décisions structurantes, puis vérifie les critères d'acceptation de l'épic.

Point de départ : la fonctionnalité pièces/diagnostic existait (#515, #516, #517) mais était
**volontairement bridée** aux hors-bord (pièces), voire aux hors-bord 2 temps (diagnostic), sur un
corpus de trois marques codées en dur. Le seeder sandbox créait pourtant déjà des in-bord
(Volvo D1-20) qui traversaient l'app sans jamais accéder ni au diagnostic ni aux pièces.

## Vue d'ensemble des livraisons

| PR                                                             | Issue | Contenu                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#593](https://github.com/MaloLebrin/boat-management/pull/593) | #573  | Catalogue de marques et modèles moteurs : tables `engine_brands` / `engine_models` (slugs stables à vie, alias `jsonb`), seeder idempotent qui tourne en production, saisie assistée par `BaseCombobox` (créée par #571), `boat_engines.engine_model_id` nullable en `SET NULL`. |
| [#594](https://github.com/MaloLebrin/boat-management/pull/594) | #574  | Familles de motorisation (`ENGINE_FAMILIES`, 13 valeurs — la **transmission** décide de la nomenclature), colonne `boat_engines.family` avec backfill best-effort, 12 ensembles in-bord + 58 pièces, éligibilité pièces par contenu (« la famille a-t-elle un ensemble »).       |
| [#600](https://github.com/MaloLebrin/boat-management/pull/600) | #575  | Références constructeur rattachées au couple (modèle, pièce) : table `engine_part_references` (`source_label` **NOT NULL**), pré-remplissage modifiable du panier, aides plaque signalétique et motif de décodage portés par la marque (12 marques documentées).                 |
| [#618](https://github.com/MaloLebrin/boat-management/pull/618) | #576  | Checklists de diagnostic in-bord diesel : 7 fiches + `electrical` élargie par sections, checklist globale `global-inboard` à préfixe de clés propre, éligibilité diagnostic par famille (même critère que les pièces), prompt IA paramétré par famille.                          |

### Suivis dans la foulée

| PR                                                             | Issue | Contenu                                                                                                                                                                   |
| -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                                                              | —     | Marques trouvables sous leurs alias dans la combobox (Mariner, Evinrude, VP…) — `listBrands()` ne servait pas `aliases`, la liste était aveugle aux anciens noms.         |
| [#615](https://github.com/MaloLebrin/boat-management/pull/615) | #597  | Sélecteur de marque guidé par le type de moteur : les marques de la gamme saisie passent en tête de liste (priorisation, **jamais** filtrage), sections dans la combobox. |
| [#606](https://github.com/MaloLebrin/boat-management/pull/606) | #601  | Le numéro de série accompagne toujours le nom du moteur à l'affichage.                                                                                                    |

## Décisions structurantes & pièges (résumé)

- **Le texte libre est l'invariant du lot.** `boat_engines.brand` / `boat_engines.model` restent
  la source de vérité (`vine.string().maxLength(120)`, aucun `.in()`), `engine_model_id` est
  nullable en `SET NULL` : aucun moteur existant n'est devenu invalide, retirer un modèle du corpus
  ne fait perdre aucune saisie, la combobox propose et ne contraint jamais.
- **Deux vocabulaires de « famille », distincts par nature.** `ENGINE_CATALOG_FAMILIES` classe les
  **gammes du catalogue** (une marque, un modèle) ; `ENGINE_FAMILIES` décrit l'**installation**
  (moteur + transmission : `inboard_diesel_saildrive` ≠ `inboard_diesel_shaft`) — c'est elle qui
  décide de la nomenclature de pièces et des fiches de diagnostic, car `kind`/`fuel`/`stroke_type`
  ne distinguent ni une ligne d'arbre d'un saildrive ni un 2 temps d'un 4 temps.
- **C'est le contenu qui décide de l'éligibilité.** `isSparePartsEligibleEngine()` (#574) comme
  `isDiagnosticEligibleEngine()` (#576) testent « la famille a-t-elle au moins un
  ensemble / une fiche » : ajouter du contenu à une famille l'ouvre automatiquement, aucune liste
  de familles éligibles à maintenir. Famille inconnue → ensembles génériques (jamais d'écran vide)
  côté pièces, non éligible côté diagnostic.
- **`source_label` NOT NULL** sur `engine_part_references` : traduction en contrainte de schéma du
  critère de #517 « aucune référence n'est affichée sans indication de sa source ». Une référence
  sans source ne peut pas entrer en base, donc pas s'afficher ; `verified_at` vide s'affiche comme
  « non revérifiée » plutôt que comme une certitude.
- **Les clés persistées ne se renomment jamais** : `part_key` du panier
  (`boat_engine_repair_cart_items`) et `step_key` des checklists
  (`boat_engine_diagnostic_checks`) — on insère, on ne renomme pas. Un test liste nommément les
  82 clés de diagnostic d'avant #576. D'où aussi `inboard-cooling` à côté de `cooling` plutôt
  qu'une fiche au sens variable.
- **Élargir plutôt que dupliquer** : la fiche `electrical` sert hors-bord et in-bord via
  `DiagnosticSection.families` (sections restreintes) ; les checklists globales par famille ont
  des **préfixes de clés disjoints** pour qu'une case cochée sur un hors-bord ne compte jamais
  pour un in-bord.
- **Prompt IA paramétré par famille** — le point le plus sensible du lot : un diesel cadré en
  2 temps produirait des conseils faux, pas seulement imprécis. Expertise annoncée, condensé de
  fiches injecté et parsing (`parseEngineDiagnosisResponse()` refuse une fiche hors famille) sont
  choisis par la famille ; sans famille connue, comportement de #516 conservé à l'identique.
- **Pièges récurrents** : `database/schema.ts` est généré, jamais édité à la main ; slugs
  d'ensemble kebab-case en code mais snake_case en clés i18n
  (`parts.assemblies.fuel_system`) ; ne pas confondre l'inventaire réel `boat_engine_parts` avec
  le catalogue statique de #517 — ce lot ne touche que le second ; les seeders de catalogue sont
  idempotents et **sans `delete`**, un `modelSlug` inconnu dans les références fait **échouer** le
  seeder (faute de frappe, pas donnée manquante).

## Critères d'acceptation de l'épic — vérification

- ✅ **Les 4 sous-issues sont livrées et fermées** (#573, #574, #575, #576 — voir tableau).
- ✅ **Un in-bord diesel accède aux pièces détachées et au diagnostic** : les familles
  `inboard_diesel_shaft` / `inboard_diesel_saildrive` ont 12 ensembles de pièces (#574) et
  7 fiches + `electrical` + checklist globale (#576) ; le Volvo D1-20 de la sandbox est éligible
  aux deux écrans. Invariants tenus par `tests/inertia/spare_parts_content.spec.ts` et
  `tests/inertia/diagnostic_content.spec.ts`.
- ✅ **Un moteur hors catalogue reste enregistrable et consultable** : `brand`/`model` en texte
  libre (`app/validators/boat_equipment.ts`), marque hors corpus → liens revendeurs génériques et
  aides plaque de toutes les marques, famille absente → ensembles génériques.
- ✅ **`docs/domain/spare-parts.md` et `docs/data/schema.md` reflètent l'état final** (avec
  `docs/domain/diagnostic.md` pour le versant #576).
- ✅ **Doc récapitulative** : ce document, référencé depuis `docs/changelog/`.

## Hors périmètre (inchangé)

Reconnaissance de pièce par photo ; vues éclatées intégrées à l'app (catalogues revendeurs sous
droits — le lien sortant demeure la solution) ; refonte de l'inventaire `boat_engine_parts` et
rapprochement automatique avec le catalogue ; compatibilité croisée des pièces entre modèles.

## Où lire la suite

- `docs/domain/spare-parts.md` — parcours pièces, éligibilité, références constructeur
- `docs/domain/diagnostic.md` — checklists, éligibilité par famille, IA
- `docs/data/schema.md` — tables `engine_brands`, `engine_models`, `engine_part_references`,
  `boat_engines.family`
- `database/data/engine_catalog/README.md` — règles de saisie du corpus
