# Domaine — Identification des pièces détachées (#517)

## Objectif fonctionnel

Guider l'utilisateur de « je ne sais pas comment cette pièce s'appelle » à « j'ai une référence commandable », en s'appuyant sur le moteur hors-bord déjà enregistré dans l'app. Insight clé de l'issue : on ne cherche jamais une pièce par son nom, on la repère **visuellement sur une vue éclatée** — le nom et la référence sont le _résultat_ de la recherche, pas son point de départ.

Parcours en 4 étapes :

```
Moteur enregistré (marque + code modèle + n° de série)
  → Choix de l'ensemble fonctionnel (carburateur, allumage, embase…)
  → Vue éclatée du catalogue revendeur (lien sortant, v1)
  → Fiche pièce (nom FR + intitulé catalogue EN, kit, prix indicatif)
  → Liste de réparation exportable
```

Même architecture que les checklists de diagnostic (#515) : contenu statique i18n-keyed dans `shared/`, persistance légère par moteur, contrôleur fin + service.

---

## Routes (`start/routes/spare_parts.ts`, auth)

| Méthode | Pattern                                        | Action                                                                                                |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GET     | `/spare-parts`                                 | `index` — moteurs éligibles de l'org, avec taille du panier                                           |
| GET     | `/boats/:boatId/engines/:engineId/spare-parts` | `identify` — étape 1 (plaque, avertissement n° de série) + ensembles + pièces sans référence + panier |
| GET     | `…/spare-parts/assemblies/:assemblySlug`       | `assembly` — liens vues éclatées, décodage Yamaha, pièces courantes                                   |
| POST    | `…/spare-parts/cart`                           | `addCartItem` — ré-ajout = incrément de quantité                                                      |
| PATCH   | `…/spare-parts/cart/:itemId`                   | `updateCartItem` — quantité (1–99) et/ou référence relevée                                            |
| DELETE  | `…/spare-parts/cart/:itemId`                   | `removeCartItem`                                                                                      |
| GET     | `…/spare-parts/cart/export`                    | `exportCart` — CSV (`;`, BOM UTF-8), endpoint de téléchargement dédié                                 |

ACL : `MaintenancePolicy` — `view` pour les pages et l'export, `edit` pour les mutations du panier. L'index exige `maintenance.view` (comme `/diagnostic`).

## Éligibilité et marques

- `isSparePartsEligibleEngine` (`shared/helpers/spare_parts.ts`) : `kind === 'outboard'`. Plus large que le diagnostic (#515, 2 temps uniquement) : la navigation catalogue vaut pour tout hors-bord.
- `resolveSparePartsBrand` rattache la marque libre du moteur au corpus v1 : `yamaha`, `johnson-evinrude`, `mercury-mariner`. Marque inconnue → liens revendeurs génériques, aides plaque de toutes les marques.

## Contenu statique (`shared/constants/spare_parts/spare_parts_content.ts`)

- **9 ensembles fonctionnels** (`SPARE_PART_ASSEMBLIES`, slugs stables) avec l'intitulé catalogue EN littéral (`CARBURETOR`, `LOWER CASING / WATER PUMP`…) : c'est un identifiant de recherche, pas de l'UI copy — exception assumée à la règle « tout texte passe par `t()` ». Idem pour les `catalogName` des pièces (`GASKET, FLOAT CHAMBER`…).
- **Pièces courantes** par ensemble : `labelKey` (FR/EN via `parts.json`), `catalogName`, `kitKey` (mention « incluse dans un kit »), `priceKey` (fourchette indicative, source affichée : catalogues revendeurs).
- **`UNREFERENCED_PARTS`** (étape 4) : durite (noire automobile uniquement), colliers/joints/visserie, bougie (équivalence NGK/Champion), goupille de cisaillement, consommables — achetables **sans** référence constructeur.
- **`ENGINE_PLATE_HINTS`** : où trouver la plaque selon la marque, avec les exemples de l'issue (Yamaha `6E0`/`500552`, Johnson `J50PLEA` décodé via Crowley Marine).
- **`SPARE_PARTS_RETAILERS`** : liens sortants par marque (Partzilla, Boats.net, Crowley Marine) — solution v1 de l'issue, les vues éclatées étant sous droits.
- **`DIAGNOSTIC_SHEET_TO_ASSEMBLY`** : fiche de diagnostic → ensemble (fiche « essence » → CARBURETOR…). Le lien inverse passe par `assembly.diagnosticSheet`.
- **`SPARE_PART_CATALOG_INDEX` / `ALL_SPARE_PART_KEYS`** : index à plat par clé, utilisé par la validation serveur du panier, le panneau panier et l'export CSV.
- Décodage Yamaha : les 5 chiffres centraux d'une référence (`6E0-14301-00`) identifient la **fonction** indépendamment du moteur (`14301` = carburateur, `44352` = turbine). La carte n'apparaît que pour un moteur Yamaha.

Les `key` des pièces (`<ensemble>.<slug>`, `unreferenced.<slug>`) sont persistées en base et ne se renomment jamais.

## Persistance — liste de réparation

Table `boat_engine_repair_cart_items` (migration `1829000000000`) : `boat_engine_id` (FK cascade), `part_key` (string 64, validé contre `ALL_SPARE_PART_KEYS`), `quantity` (défaut 1, ré-ajout = incrément, plafond 99), `reference` (nullable — la référence relevée par l'utilisateur sur la vue éclatée), unique `(boat_engine_id, part_key)`.

Service : `app/services/boat_engine_spare_parts_service.ts` (erreurs dans `app/exceptions/spare_parts_errors.ts`, types dans `shared/types/spare_parts.ts`, transformer dans `app/transformers/spare_parts_transformer.ts`).

## Liens avec l'existant

- Fiche de diagnostic (#515) → lien « Identifier les pièces de cet ensemble » (`inertia/pages/diagnostic/sheet.vue`).
- Onglet Pièces de la page moteur → CTA « Identifier une pièce » (hors-bord uniquement).
- Sidebar, section Maintenance → entrée « Pièces détachées » (`nav.spareParts`).

## Hors périmètre (v1, comme l'issue)

Reconnaissance de pièce par photo ; vues éclatées intégrées (partenariat/affiliation ou schémas propres) ; marques hors corpus.
