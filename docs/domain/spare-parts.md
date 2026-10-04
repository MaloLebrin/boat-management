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

## Chat public de recherche de références (#634, Phase 2)

Le même chatbot, ouvert en page publique marketing (`/en/engine-part-finder-ai`, `/fr/reference-piece-moteur-ia`) — le tunnel d'acquisition jumeau du diagnostic public (#602), en saisie libre marque + numéro de série.

- **Service dédié `PublicPartSearchService`** (contrôleur `PublicPartSearchController`, POST non localisés `/parts-ai/conversations[...]` sous `publicPartSearchThrottle` 6/min) : trois régimes de quota calqués sur #602 — anonyme = `PUBLIC_PART_SEARCH_LIFETIME_LIMIT` (2) conversations à vie comptées par la session (liste de tokens = compteur **et** preuve de propriété ; depuis #762 ce compteur n'est qu'un confort d'UX, le garde-fou étant le compteur par IP et le budget de tokens décrits dans `docs/domain/public-ai-surface.md`) ; `starter` = même plafond compté en base sur l'org ; plans avec IA = sans plafond, quota de tokens mensuel.
- **Même table, discriminant `boat_engine_id` null** : les conversations publiques partagent `ai_part_search_conversations` avec la Phase 1 et tous les accès publics filtrent `whereNull('boatEngineId')` — une conversation du chat connecté est invisible et injoignable depuis la page publique.
- **Mêmes phases, deux ajustements** : une identification réussie snapshotte `context.model` (code plaque, pour les liens revendeurs) et `context.family` via `engineFamilyFromCatalogModel()` ; famille inconnue → vocabulaire = **catalogue complet** (le repli générique de la navigation manuelle est trop étroit pour un visiteur dont on ne sait rien). Anti-hallucination inchangée.
- **Ton** : les builders de prompts prennent un paramètre `tone` — `formal` (défaut, app connectée) ou `informal` (public) ; namespace i18n dédié `publicPartSearch` (fr tutoiement). `SparePartsReferenceSource` (prop `i18nPrefix`) et `SparePartsRetailerLinks` (prop `keys`) affichent les libellés publics sans dupliquer les composants.
- **SEO (2026-09-22)** : `show()` sert aussi une prop `content` (`PublicPartSearchContentProps`) construite par `PublicPartSearchContentService` — étapes, huit pièces fréquentes, maillage, FAQ, CTA final — le contenu indexable de la page, quota interpolé depuis `PUBLIC_PART_SEARCH_LIFETIME_LIMIT`. Tests : `tests/functional/marketing/parts_ai_seo.spec.ts`.
- **Acquisition** : CTA `/signup?from=parts` (quota épuisé, carte résultat) → notice `auth.signup.fromPartsAiNotice` ; liens nav/footer publics ; entrée sitemap `partsAi`. La mise en avant home/tarifs (pattern #609) reste à faire.

## Inventaire de pièces au niveau de l'organisation (#892)

Jusqu'ici, le stock était **par pièce de moteur** (`boat_engine_parts.stock` / `min_stock_alert`) : douze moteurs du même modèle, douze « stocks » du même filtre, pour un seul carton à l'atelier. L'inventaire tient ce stock **une fois pour toute l'organisation**. Plans **Pro et Entreprise** (`canManageInventory`, capacité de tier pure) ; Starter est renvoyé vers les offres par `requireModulePlan({ feature: 'inventory' })`, posé sur tout le groupe de routes.

### Modèle

- `inventory_items` — l'article : désignation, référence, unité (`unit`, `liter`, `meter`, `kit`, `box`), `quantity` décimale, `min_quantity` (seuil), emplacement, `average_cost`, fournisseur habituel.
- `inventory_movements` — le journal, une ligne signée par entrée ou sortie : `purchase`, `consumption`, `adjustment`, `return`, avec l'entretien (`maintenance_event_id`) ou le bon de commande d'origine, l'auteur et une note. **La quantité d'un article est toujours la somme de son journal** : seul `InventoryService.recordMovement` l'écrit, sous verrou (`FOR UPDATE`) et dans la transaction de l'appelant.
- `suppliers`, `purchase_orders`, `purchase_order_lines` — fournisseurs et bons de commande (`draft` → `sent` → `received`, ou `cancelled`), numérotés séquentiellement par organisation (verrou consultatif de transaction).
- `boat_engine_parts.inventory_item_id` — liaison facultative d'une pièce moteur à un article.

### Règles

- **Stock bas** : `quantity <= min_quantity`, seuil renseigné — la même règle que les pièces moteur (`isInventoryLow`, `shared/helpers/inventory.ts`).
- **Prix moyen pondéré** à chaque entrée valorisée (achat, stock initial, reprise) : `(stock détenu × prix moyen + reçu × prix) / (stock détenu + reçu)`. Un stock négatif ne pèse pas ; sans prix moyen antérieur, le prix d'achat fait foi. Un retour ne change pas le prix moyen.
- **Comptage** (`POST /inventory/:id/adjust`) : on saisit la quantité comptée, le mouvement `adjustment` porte l'écart ; aucun mouvement si rien ne change. Journal d'audit `inventory.adjust`.
- **Entretien** : saisir un entretien avec une pièce moteur **reliée** écrit un mouvement `consumption` (quantité de la ligne, 1 par défaut) dans la transaction de l'entretien, et le `stock` local de la pièce n'est plus décrémenté. Une pièce non reliée garde l'ancien décrément local. **Supprimer l'entretien** remet ses sorties en stock (mouvement `return` du net par article). Le stock peut devenir négatif : c'est un signal (saisie antérieure à la livraison, ou inventaire faux), pas une erreur.
- **Stock vu d'une pièce reliée** : `effectivePartStock()` — la quantité et le seuil de l'article remplacent les compteurs locaux dans l'onglet Pièces, la fiche pièce, `get_engine` de l'assistant et le contexte des suggestions IA ; `listLowStock(engineId)` juge une pièce reliée sur son article.
- **Seuil d'alerte d'une pièce moteur** (#947) : `min_stock_alert` se saisit dans `EnginePartModal` (champ « Seuil d'alerte », prérempli depuis `engine.parts[].minStockAlert`). Sur `PUT /boats/:boatId/engines/:engineId/parts/:partId`, un champ **absent** laisse le seuil inchangé et un champ **vide** l'efface — comme `inventoryItemId`. Une valeur négative ou non entière est refusée.
- **Délier ne perd rien** : le `stock` local d'une pièce n'est ni effacé ni migré ; il redevient la référence si on délie la pièce, ou si l'article est supprimé (FK `SET NULL`).
- **Reprise des stocks moteur** (`POST /inventory/import-engine-parts`) : les pièces suivies en stock (compteur ou seuil saisi) et non reliées sont regroupées par référence (à défaut par désignation, casse ignorée). Un article par groupe : quantité = **somme** des stocks moteur (mouvement `adjustment` annoté — à vérifier par un comptage si les compteurs désignaient le même carton), seuil = le plus haut, prix moyen = moyenne des prix d'achat renseignés. Idempotente. Journal `inventory.import`.
- **Bons de commande** : seul un brouillon se modifie (lignes remplacées). « Préparer la commande » (`POST /inventory/orders/reorder`) crée un brouillon avec les articles sous leur seuil dont c'est le fournisseur habituel, à `ceil(2 × seuil − quantité)` (une unité au moins), au dernier prix moyen. Une ligne sans prix reprend le prix moyen de l'article.
- **Réception** (`POST /inventory/orders/:id/receive`, depuis `draft` ou `sent`, bon verrouillé) : un mouvement `purchase` par ligne, prix moyen recalculé ; si le bon est **affecté à un bateau**, une dépense « entretien » de son total HT est inscrite au budget de ce bateau (`boat_budget_entries`, référencée par `purchase_orders.budget_entry_id`). Sans bateau (« stock atelier »), aucune dépense : le budget par bateau n'a pas de ligne d'organisation.
- **Suppressions** (admin, `inventory.delete`) : un article encore porté par un bon de commande, un fournisseur qui a des bons, un bon reçu ou envoyé ne se suppriment pas.
- **Rôles** : `inventory.view` et `inventory.manage` pour admin et member ; `inventory.delete` admin seul ; le mechanic n'y a pas accès (ses capabilities restent `maintenance.*`).

### Routes (`start/routes/inventory.ts`, auth + garde de plan)

| Méthode          | Pattern                                       | Action                                    |
| ---------------- | --------------------------------------------- | ----------------------------------------- |
| GET              | `/inventory?q=&filter=all\|low`               | liste, recherche, filtre stock bas        |
| POST / PUT / DEL | `/inventory`, `/inventory/:id`                | article (création avec stock initial)     |
| GET              | `/inventory/:id`                              | fiche : chiffres, pièces reliées, journal |
| POST             | `/inventory/:id/adjust`                       | comptage                                  |
| POST             | `/inventory/import-engine-parts`              | reprise des stocks moteur                 |
| GET / POST       | `/inventory/orders`                           | bons de commande                          |
| PUT / DEL        | `/inventory/orders/:id`                       | modifier (brouillon), supprimer           |
| POST             | `/inventory/orders/reorder`                   | brouillon depuis les stocks bas           |
| POST             | `/inventory/orders/:id/send\|receive\|cancel` | transitions                               |
| POST / PUT / DEL | `/inventory/suppliers[/:id]`                  | fournisseurs                              |

Code : `InventoryService`, `SupplierService`, `PurchaseOrderService` ; contrôleurs `InventoryController`, `SuppliersController`, `PurchaseOrdersController` ; `InventoryPolicy` ; erreurs `app/exceptions/inventory_errors.ts` ; types `shared/types/inventory.ts` ; calculs purs `shared/helpers/inventory.ts`.

### Ailleurs dans l'app

- **Widget « Pièces manquantes »** (#840) : une pièce reliée ne remonte plus par son compteur local ; la carte affiche à la place un lien « Stock atelier — N articles sous le seuil » vers `/inventory?filter=low` (`inventoryLowCount`).
- **Assistant** : outil `inventory_status` (articles, stock bas d'abord, bons ouverts), gardé par `inventory.view` + `canManageInventory` ; cibles de navigation `inventory.index` et `purchaseOrders.index` ; entrée `parts-inventory` de la base de connaissance.
- **Fiche moteur** : prop `inventoryOptions` (articles de l'organisation, `null` hors plan ou sans `inventory.view`) pour le sélecteur « Article de l'inventaire » du formulaire de pièce.

## Hors périmètre

Reconnaissance de pièce par photo ; vues éclatées intégrées (partenariat/affiliation ou schémas propres) ; reprise automatisée des catalogues revendeurs (contenus sous droits) ; prix et disponibilité en temps réel — les `priceKey` restent des fourchettes indicatives ; compatibilité croisée entre modèles (« cette turbine va aussi sur… ») ; affiliation ou partenariat revendeur, point ouvert de #517. Les checklists de diagnostic in-bord, un temps listées ici, sont livrées par #576 — voir `docs/domain/diagnostic.md`.

Côté inventaire (#892), restent hors périmètre : export PDF / envoi par e-mail du bon de commande, création d'un bon depuis la liste de réparation IA, notification push/e-mail du stock bas (le widget et la page suffisent pour l'instant), codes-barres / scan, prix fournisseurs en temps réel.
