# Domaine — Identification des pièces détachées (#517, #574, #575)

## Objectif fonctionnel

Guider l'utilisateur de « je ne sais pas comment cette pièce s'appelle » à « j'ai une référence commandable », en s'appuyant sur le moteur déjà enregistré dans l'app. Insight clé de l'issue : on ne cherche jamais une pièce par son nom, on la repère **visuellement sur une vue éclatée** — le nom et la référence sont le _résultat_ de la recherche, pas son point de départ.

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

| Méthode | Pattern                                        | Action                                                                                                 |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET     | `/spare-parts`                                 | `index` — moteurs éligibles de l'org, avec taille du panier                                            |
| GET     | `/boats/:boatId/engines/:engineId/spare-parts` | `identify` — étape 1 (plaque, avertissement n° de série) + ensembles + pièces sans référence + panier  |
| GET     | `…/spare-parts/assemblies/:assemblySlug`       | `assembly` — liens vues éclatées, décodage de référence, pièces courantes et leurs références sourcées |
| POST    | `…/spare-parts/cart`                           | `addCartItem` — ré-ajout = incrément de quantité                                                       |
| PATCH   | `…/spare-parts/cart/:itemId`                   | `updateCartItem` — quantité (1–99) et/ou référence relevée                                             |
| DELETE  | `…/spare-parts/cart/:itemId`                   | `removeCartItem`                                                                                       |
| GET     | `…/spare-parts/cart/export`                    | `exportCart` — CSV (`;`, BOM UTF-8), endpoint de téléchargement dédié                                  |

ACL : `MaintenancePolicy` — `view` pour les pages et l'export, `edit` pour les mutations du panier. L'index exige `maintenance.view` (comme `/diagnostic`).

## Éligibilité et familles de motorisation (#574)

La nomenclature est décidée par la **famille de motorisation** (`boat_engines.family`), pas par le `kind` : `kind`, `fuel` et `stroke_type` ne distinguent ni une ligne d'arbre d'un saildrive, ni un 2 temps d'un 4 temps, et c'est la transmission qui change les pièces. Vocabulaire fermé `ENGINE_FAMILIES` (13 valeurs, `shared/types/engine_catalog.ts`) — à ne pas confondre avec `ENGINE_CATALOG_FAMILIES`, qui classe les **modèles du catalogue** (#573) et ne peut pas connaître l'installation.

- `isSparePartsEligibleEngine` (`shared/helpers/spare_parts.ts`) : « la famille du moteur a-t-elle au moins un ensemble ». Avec le contenu actuel, **tout moteur est servi** — un in-bord diesel comme un hors-bord — puisqu'une famille inconnue retombe sur les ensembles génériques (`starting-charging`, `controls`, pièces sans référence). Le garde `EngineNotSparePartsEligibleError` reste en place pour le jour où un ensemble générique se resserrerait.
- `resolveEngineFamily()` : la famille **saisie**, sinon celle que `engineFamilyFromSignals()` (`shared/helpers/engine_family.ts`) déduit de `kind`/`fuel`/`stroke_type` — mêmes règles que le backfill de la migration `1838000000000`, pour qu'un moteur créé hors formulaire rende la même chose qu'un moteur backfillé.
- `assembliesForEngine()` / `isAssemblyForEngine()` : ce qu'un écran affiche, et ce qu'une URL d'ensemble a le droit d'ouvrir. La page d'ensemble refuse un ensemble étranger à la famille (URL forgée, lien croisé) avec le flash `flash.spareParts.assemblyNotFound`.
- `sparePartsBrandFromCatalogSlug` rattache la marque du catalogue moteur (#573) au corpus pièces v1 : `yamaha`, `johnson-evinrude`, `mercury-mariner`. Marque hors corpus → liens revendeurs génériques, aides plaque de toutes les marques.

## Contenu statique (`shared/constants/spare_parts/spare_parts_content.ts`)

- **21 ensembles fonctionnels** (`SPARE_PART_ASSEMBLIES`, slugs stables) : les 9 hors-bord de #517 (`spare_parts_content.ts`) et les 12 in-bord, embases et groupes électrogènes de #574 (`inboard_assemblies.ts` — eau de mer, eau douce, injection, échappement, inverseur, saildrive, embase Z, ligne d'arbre, démarrage/charge, lubrification, admission/turbo, commandes), chacun avec l'intitulé catalogue EN littéral (`CARBURETOR`, `LOWER CASING / WATER PUMP`…) : c'est un identifiant de recherche, pas de l'UI copy — exception assumée à la règle « tout texte passe par `t()` ». Idem pour les `catalogName` des pièces (`GASKET, FLOAT CHAMBER`…).
- **Pièces courantes** par ensemble : `labelKey` (FR/EN via `parts.json`), `catalogName`, `kitKey` (mention « incluse dans un kit »), `priceKey` (fourchette indicative, source affichée : catalogues revendeurs).
- **`UNREFERENCED_PARTS`** (étape 4) : durite (noire automobile uniquement), colliers/joints/visserie, bougie (équivalence NGK/Champion), goupille de cisaillement, consommables — achetables **sans** référence constructeur.
- **Aides plaque signalétique** : elles ont quitté ce fichier avec #575 (`ENGINE_PLATE_HINTS` supprimé) et vivent en colonnes de `engine_brands` — voir la section « Références constructeur » ci-dessous.
- **`SPARE_PARTS_RETAILERS`** : liens sortants par marque (Partzilla, Boats.net, Crowley Marine) — solution v1 de l'issue, les vues éclatées étant sous droits.
- **`DIAGNOSTIC_SHEET_TO_ASSEMBLY`** : fiche de diagnostic → ensemble (fiche « essence » → CARBURETOR…). Le lien inverse passe par `assembly.diagnosticSheet`. Les deux tables sont **réciproques** depuis #576, et trois invariants le vérifient (`tests/inertia/spare_parts_content.spec.ts`) : l'aller-retour boucle, toute fiche citée par un ensemble figure dans la table, et les deux côtés partagent au moins une famille. Deux incohérences ont été reprises au passage — `gearcase` pointait vers `lower-unit`, qui renvoie vers `cooling`, et `electrical` vers `ignition`, sans réciproque ; ils visent désormais `propeller` et `starting-charging`. Voir `docs/domain/diagnostic.md`.
- **`SparePartAssembly.families`** : les familles auxquelles l'ensemble s'applique — jamais vide. C'est cette déclaration qui évite de proposer un carburateur à un diesel ou un saildrive à un hors-bord. Un ensemble ajouté sans famille connue est rejeté par `tests/inertia/spare_parts_content.spec.ts`.
- **`SPARE_PART_CATALOG_INDEX` / `ALL_SPARE_PART_KEYS`** : index à plat par clé, utilisé par la validation serveur du panier, le panneau panier et l'export CSV.
- Décodage de référence : les 5 chiffres centraux d'une référence Yamaha (`6E0-14301-00`) identifient la **fonction** indépendamment du moteur (`14301` = carburateur, `44352` = turbine). Depuis #575 ce n'est plus un cas codé en dur mais un `reference_pattern` porté par la marque — la carte n'apparaît que pour les marques qui en déclarent un.

Les `key` des pièces (`<ensemble>.<slug>`, `unreferenced.<slug>`) sont persistées en base et ne se renomment jamais.

## Références constructeur (#575)

Le parcours de #517 s'arrêtait **avant la référence** : il amenait l'utilisateur jusqu'à la vue éclatée du revendeur, à charge pour lui d'y relever le numéro. #575 ajoute une couche par-dessus, sans rien retirer — une pièce sans référence connue affiche exactement l'écran d'avant, liens revendeurs compris.

### Table `engine_part_references`

Un couple (modèle du catalogue #573, clé de pièce) → une référence, avec sa source. Migration `1839000000000`, détail des colonnes dans `docs/data/schema.md`.

**`source_label` est `NOT NULL`, et c'est le cœur de l'issue** : c'est la traduction en contrainte de schéma du critère d'acceptation de #517, « aucune référence n'est affichée sans indication de sa source ». Une référence sans source ne peut pas entrer en base, donc ne peut pas s'afficher. Le type `EnginePartReferenceSeed` l'exige de même côté données, et `ENGINE_CATALOG_PART_REFERENCES` (`database/data/engine_catalog/index.ts`) refuse au chargement une source vide, une clé de pièce inconnue ou un couple déclaré deux fois.

`verified_at` reste vide tant que l'entrée n'a pas été recontrôlée sur sa source. L'écran le dit alors explicitement (« non revérifiée — contrôlez-la sur la vue éclatée avant de commander ») plutôt que de la présenter comme certaine : une turbine commandée sur une mauvaise référence est un aller-retour perdu, souvent en pleine saison. C'est aussi ce qui permet de repérer les entrées à recontrôler quand le corpus grossira.

### Corpus

`database/data/engine_catalog/part_references.ts`, seedé par le même seeder idempotent que #573. Priorisation : pièces d'usure (turbines, kits de pompe à eau, filtres, anodes, joints de saildrive, courroies) des modèles les plus répandus, puis les modèles déjà présents dans l'app (`malo_seeder`, `sandbox_seeder`). L'exhaustivité n'est pas un prérequis — les liens revendeurs restent le repli.

La reprise automatisée des catalogues revendeurs reste **hors périmètre** : les contenus sont sous droits, la saisie est manuelle et sourcée, entrée par entrée. Un modèle dont le slug n'existe pas au catalogue **fait échouer le seeder** : c'est une faute de frappe, pas une donnée manquante.

### Où la référence apparaît

- **Liste des pièces d'un ensemble** — `SparePartsReferenceSource.vue`, seul composant de l'app qui affiche une référence du catalogue. En faire un composant garantit qu'on ne peut pas en afficher une sans dire d'où elle vient.
- **Ajout au panier** — la référence connue est **pré-remplie** (`BoatEngineSparePartsService.addCartItem`) et **reste modifiable** : le catalogue assiste la saisie, il ne la contraint pas.
- **Panier** — la source n'est créditée que tant que la ligne porte **la** référence du catalogue ; dès que l'utilisateur en saisit une autre, la source ne la couvre plus et disparaît.
- **Export CSV** — colonne `parts.cart.export.headers.referenceSource`. Une référence saisie à la main est exportée comme telle (`parts.cart.export.manualSource`), jamais sous la source du catalogue.

### Plaque signalétique et décodage portés par la marque

`engine_brands.plate_location_key` / `plate_example_key` remplacent le tableau statique `ENGINE_PLATE_HINTS`, qui s'arrêtait à trois marques et les affichait toutes les trois dès que la marque du moteur n'était pas reconnue. `EngineCatalogService.plateHints()` sert l'aide de la marque résolue, ou toutes celles connues sinon — même comportement qu'avant, servi par le catalogue. Une marque sans aide n'apparaît pas ; aucune aide du tout → un message plutôt qu'une liste vide.

`engine_brands.reference_pattern` (`{ template, fallbackModelCode, modelCodePattern, explanationKey }`) généralise le décodage : `referenceExampleFromPattern()` (`shared/helpers/spare_parts.ts`) remplace `yamahaReferenceExample()`, qui n'en est plus qu'un cas particulier — le comportement Yamaha de #517 est préservé à l'identique, y compris le repli sur `6E0` quand le champ `model` n'est pas un code plaque.

L'avertissement « le numéro de série départage les variantes » reste affiché en permanence, et se précise (`parts.identify.serialWarning.ambiguous`) dès qu'un `model_code` couvre plusieurs `engine_models`.

## Persistance — liste de réparation

Table `boat_engine_repair_cart_items` (migration `1829000000000`) : `boat_engine_id` (FK cascade), `part_key` (string 64, validé contre `ALL_SPARE_PART_KEYS`), `quantity` (défaut 1, ré-ajout = incrément, plafond 99), `reference` (nullable — pré-remplie depuis `engine_part_references` quand elle est connue (#575), sinon relevée par l'utilisateur sur la vue éclatée ; modifiable dans les deux cas), unique `(boat_engine_id, part_key)`.

Service : `app/services/boat_engine_spare_parts_service.ts` (erreurs dans `app/exceptions/spare_parts_errors.ts`, types dans `shared/types/spare_parts.ts`, transformer dans `app/transformers/spare_parts_transformer.ts`).

## Liens avec l'existant

- Fiche de diagnostic (#515) → lien « Identifier les pièces de cet ensemble » (`inertia/pages/diagnostic/sheet.vue`).
- Onglet Pièces de la page moteur → CTA « Identifier une pièce », conditionné par `isSparePartsEligibleEngine()` — la règle n'est jamais dupliquée dans un template.
- Sidebar, section Maintenance → entrée « Pièces détachées » (`nav.spareParts`).

## Chat IA de recherche de références (#634, Phase 1)

Un chatbot conversationnel exploite enfin le `serialNumber` des moteurs : il identifie le modèle exact (`engine_models`) à partir du numéro de série et du motif de plaque de la marque, puis mappe la pièce demandée sur le vocabulaire fermé `SPARE_PART_CATALOG_INDEX` filtré par la famille (#574). Réservé aux plans avec IA (`QuotaService.assertCanUseAI` côté backend, `UpgradePlanModal` côté front), quota de tokens mensuel habituel (`AiTokenQuotaService.withOrgLock`).

- **Machine à états à deux phases** (colonne `phase` de `ai_part_search_conversations`) : `engine` (identification) puis `part` (choix de pièce). Court-circuit : un moteur dont le modèle est résolu par le catalogue (#573) démarre directement en phase `part` ; une marque hors catalogue assume l'échec d'emblée (`context.identificationFailed`).
- **Anti-hallucination** : le LLM ne rend que des identifiants du vocabulaire injecté dans son prompt (`modelCode` de la liste de la marque, `partKey` du catalogue), revalidés par le backend (`EngineCatalogService.resolveModelForEngine`, vocabulaire de la famille). La référence affichée provient **exclusivement** de `engine_part_references` via `SparePartsReferenceSource` ; pièce sans référence → repli revendeurs de #517 ; aucune pièce ne correspond → renvoi vers l'identification manuelle. Les messages de repli sont des textes statiques i18n, jamais délégués au modèle.
- **Routes** `spareParts.chat.show|start|message` (`start/routes/spare_parts.ts`, groupe auth, mutations sous `aiThrottle`), contrôleur `SparePartChatController` en redirections Inertia. Service `SparePartChatService` + prompts purs `spare_part_chat_prompt_service.ts` (fr/en), types `shared/types/spare_part_chat.ts`, erreurs `app/exceptions/spare_part_chat_errors.ts`.
- Une conversation = une pièce (10 messages utilisateur max, instruction de clôture au dernier tour) ; « nouvelle recherche » pour recommencer. L'ajout au panier passe par la route `spareParts.cart.add` existante, qui pré-remplit déjà la référence.

La Phase 2 de #634 (chat public marketing, saisie libre marque + numéro de série) n'est pas livrée.

## Hors périmètre

Reconnaissance de pièce par photo ; vues éclatées intégrées (partenariat/affiliation ou schémas propres) ; reprise automatisée des catalogues revendeurs (contenus sous droits) ; prix et disponibilité en temps réel — les `priceKey` restent des fourchettes indicatives ; compatibilité croisée entre modèles (« cette turbine va aussi sur… ») ; affiliation ou partenariat revendeur, point ouvert de #517. Les checklists de diagnostic in-bord, un temps listées ici, sont livrées par #576 — voir `docs/domain/diagnostic.md`.
