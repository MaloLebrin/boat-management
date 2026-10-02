# 2026-10-02 — Inventaire de pièces au niveau de l'organisation : stock central, fournisseurs, commandes (#892)

Le stock était tenu **par pièce de moteur** : une flotte de 8 bateaux et 12 moteurs du même modèle
comptait 12 « stocks » du même filtre, pour un seul carton à l'atelier. L'inventaire tient
désormais ce stock une fois pour toute l'organisation, le décrémente à chaque entretien et le
réapprovisionne par des bons de commande. Plans **Pro et Entreprise**. Détail complet :
`docs/domain/spare-parts.md`, section « Inventaire de pièces ».

- **Tables.** Migration `1885000000000_create_inventory` : `suppliers`, `inventory_items`
  (quantité décimale, seuil, emplacement, prix moyen pondéré, fournisseur habituel),
  `inventory_movements` (journal signé `purchase` / `consumption` / `adjustment` / `return`),
  `purchase_orders` (numéro séquentiel par organisation, `draft` → `sent` → `received` ou
  `cancelled`, bateau d'affectation facultatif) et `purchase_order_lines`.
  `boat_engine_parts.inventory_item_id` relie une pièce moteur à un article.
- **Aucune perte de donnée.** Le `stock` local des pièces moteur n'est ni effacé ni migré : il
  reste lu tant que la pièce n'est pas reliée, et redevient la référence si on la délie ou si
  l'article est supprimé.
- **Reprise des stocks moteur.** `POST /inventory/import-engine-parts` regroupe les pièces suivies
  en stock par référence (à défaut par désignation), crée un article par groupe (quantité = somme
  des stocks moteur, seuil = le plus haut, prix moyen = moyenne des prix d'achat) et y relie les
  pièces. Idempotente. Un bandeau la propose sur `/inventory`.
- **Décrément à la consommation.** Saisir un entretien avec une pièce reliée écrit un mouvement
  `consumption` dans la transaction de l'entretien ; supprimer l'entretien remet les pièces en
  stock (`return`). Les pièces non reliées gardent l'ancien décrément local.
- **Comptage.** `POST /inventory/:id/adjust` : on saisit la quantité comptée, le mouvement porte
  l'écart (journal d'audit `inventory.adjust`).
- **Commandes.** `POST /inventory/orders/reorder` prépare un brouillon avec les articles sous leur
  seuil d'un fournisseur (remontés au double du seuil, au prix moyen). La réception écrit un
  mouvement `purchase` par ligne, recalcule le prix moyen et, si le bon est affecté à un bateau,
  inscrit son total HT au budget de ce bateau (catégorie entretien). Journal d'audit
  `purchase_order.create|send|receive|cancel|delete`.
- **Stock bas.** Une pièce reliée est jugée sur son article (onglet Pièces, fiche pièce, outil
  `get_engine` de l'assistant, suggestions IA). Le widget « Pièces manquantes » ne la compte plus
  par son compteur local et affiche un lien « Stock atelier » vers `/inventory?filter=low`.
- **Écrans.** `/inventory` (liste, recherche, filtre stock bas), `/inventory/:id` (chiffres,
  pièces reliées, mouvements), `/inventory/orders` (bons, fournisseurs). Sélecteur « Article de
  l'inventaire » dans le formulaire de pièce moteur. Entrée « Inventaire » dans la section
  Maintenance de la nav.
- **Droits.** Nouvelles capabilities `inventory.view` et `inventory.manage` (admin, member),
  `inventory.delete` (admin). Le mechanic n'y a pas accès. Plan : `canManageInventory` (Pro,
  Entreprise) ; Starter est renvoyé vers les offres (`flash.quota.inventoryExceeded`).
- **Assistant.** Outil `inventory_status`, cibles de navigation `inventory.index` et
  `purchaseOrders.index`, entrée `parts-inventory` de la base de connaissance.
- **Tests.** `tests/unit/helpers/inventory.spec.ts`,
  `tests/integration/services/inventory_service.spec.ts`,
  `tests/functional/inventory/inventory.spec.ts`, `tests/inertia/inventory.spec.ts` ; fixture
  cross-org étendue (article, fournisseur, bon de commande).
- **Hors périmètre** (suivi à ouvrir) : export PDF et envoi par e-mail du bon de commande, bon de
  commande créé depuis la liste de réparation IA, notification du stock bas, codes-barres, prix
  fournisseurs en temps réel.
