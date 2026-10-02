/** Erreurs de l'inventaire de pièces (#892) : articles, fournisseurs, commandes. */

export class InventoryItemNotFoundError extends Error {
  name = 'InventoryItemNotFoundError'
}

export class SupplierNotFoundError extends Error {
  name = 'SupplierNotFoundError'
}

export class PurchaseOrderNotFoundError extends Error {
  name = 'PurchaseOrderNotFoundError'
}

/** Un article encore présent sur un bon de commande ne se supprime pas. */
export class InventoryItemInUseError extends Error {
  name = 'InventoryItemInUseError'
}

/** Un fournisseur qui a des bons de commande ne se supprime pas. */
export class SupplierInUseError extends Error {
  name = 'SupplierInUseError'
}

/** Geste impossible dans l'état actuel du bon (modifier un bon reçu, recevoir un brouillon annulé…). */
export class PurchaseOrderTransitionError extends Error {
  name = 'PurchaseOrderTransitionError'

  constructor(
    readonly from: string,
    readonly action: string
  ) {
    super(`Cannot ${action} a purchase order in status "${from}"`)
  }
}

/** Le bateau d'affectation n'appartient pas à l'organisation. */
export class PurchaseOrderBoatNotFoundError extends Error {
  name = 'PurchaseOrderBoatNotFoundError'
}

/** Aucun article sous son seuil pour ce fournisseur : rien à commander. */
export class NothingToReorderError extends Error {
  name = 'NothingToReorderError'
}
