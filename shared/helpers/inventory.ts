/**
 * Calculs purs de l'inventaire (#892), partagés entre les services et l'UI.
 * Les quantités sont décimales (2 décimales, comme en base) : on arrondit
 * après chaque opération pour ne jamais accumuler d'erreur flottante.
 */

export function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100
}

/** Un seuil renseigné et une quantité qui l'atteint : même règle que les pièces moteur. */
export function isInventoryLow(quantity: number, minQuantity: number | null): boolean {
  return minQuantity !== null && quantity <= minQuantity
}

/**
 * Prix moyen pondéré après une entrée en stock. Le stock déjà négatif (des
 * sorties saisies avant la réception) ne compte pas : il n'a pas de valeur, il
 * se résorbe avec la livraison. Sans prix moyen antérieur, le prix d'achat fait foi.
 */
export function weightedAverageCost(
  currentQuantity: number,
  currentAverage: number | null,
  receivedQuantity: number,
  unitCost: number
): number {
  const held = Math.max(currentQuantity, 0)
  if (currentAverage === null || held === 0) return roundQuantity(unitCost)
  const total = held * currentAverage + receivedQuantity * unitCost
  return roundQuantity(total / (held + receivedQuantity))
}

/**
 * Quantité proposée à la commande pour un article sous son seuil : on remonte
 * au double du seuil, soit un seuil de marge au-dessus de l'alerte. Toujours au
 * moins une unité, arrondie à l'unité supérieure (on ne commande pas 0,4 filtre).
 */
export function suggestedReorderQuantity(quantity: number, minQuantity: number | null): number {
  if (minQuantity === null) return 1
  return Math.max(1, Math.ceil(minQuantity * 2 - quantity))
}

/** Écart à écrire pour qu'un inventaire tournant aboutisse à la quantité comptée. */
export function adjustmentDelta(currentQuantity: number, countedQuantity: number): number {
  return roundQuantity(countedQuantity - currentQuantity)
}

/** Valeur du stock au prix moyen, `null` si elle n'a pas de sens. */
export function stockValue(quantity: number, averageCost: number | null): number | null {
  if (averageCost === null || quantity <= 0) return null
  return roundQuantity(quantity * averageCost)
}

/** Total HT d'un bon de commande. */
export function purchaseOrderTotal(lines: { quantity: number; unitCost: number }[]): number {
  return roundQuantity(lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0))
}

/**
 * Stock « vu » d'une pièce moteur : reliée à un article (#892), c'est la
 * quantité et le seuil de l'inventaire qui font foi ; sinon ses compteurs locaux.
 */
export function effectivePartStock(
  part: { stock: number | null; minStockAlert: number | null },
  item: { quantity: number; minQuantity: number | null } | null | undefined
): { stock: number | null; minStockAlert: number | null; fromInventory: boolean } {
  if (item) return { stock: item.quantity, minStockAlert: item.minQuantity, fromInventory: true }
  return { stock: part.stock, minStockAlert: part.minStockAlert, fromInventory: false }
}

/** Même règle de stock bas pour une pièce moteur, reliée ou non. */
export function isPartLow(
  part: { stock: number | null; minStockAlert: number | null },
  item: { quantity: number; minQuantity: number | null } | null | undefined
): boolean {
  const view = effectivePartStock(part, item)
  return view.minStockAlert !== null && view.stock !== null && view.stock <= view.minStockAlert
}
