import type {
  InventoryFilter,
  InventoryMovementReason,
  InventoryUnit,
  PurchaseOrderStatus,
} from '../types/inventory.js'

/** Inventaire de pièces au niveau de l'organisation (#892). */
export const INVENTORY_UNITS: readonly InventoryUnit[] = ['unit', 'liter', 'meter', 'kit', 'box']

export const INVENTORY_MOVEMENT_REASONS: readonly InventoryMovementReason[] = [
  'purchase',
  'consumption',
  'adjustment',
  'return',
]

export const PURCHASE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  'draft',
  'sent',
  'received',
  'cancelled',
]

export const INVENTORY_FILTERS: readonly InventoryFilter[] = ['all', 'low']

/** Lignes du journal affichées sur la fiche d'un article. */
export const INVENTORY_MOVEMENTS_LIMIT = 100

/** Lignes maximum d'un bon de commande. */
export const PURCHASE_ORDER_MAX_LINES = 50
