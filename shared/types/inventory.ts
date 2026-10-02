/**
 * Inventaire de pièces au niveau de l'organisation (#892) : articles du stock
 * central, mouvements, fournisseurs et bons de commande.
 */

export type InventoryUnit = 'unit' | 'liter' | 'meter' | 'kit' | 'box'
export type InventoryMovementReason = 'purchase' | 'consumption' | 'adjustment' | 'return'
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled'
export type InventoryFilter = 'all' | 'low'

export interface InventoryItemRow {
  id: number
  name: string
  reference: string | null
  unit: InventoryUnit
  quantity: number
  minQuantity: number | null
  location: string | null
  averageCost: number | null
  /** Valeur du stock au prix moyen (`null` sans prix moyen ou en quantité négative). */
  stockValue: number | null
  supplierId: number | null
  supplierName: string | null
  notes: string | null
  /** `quantity <= minQuantity`, seuil renseigné. */
  isLow: boolean
  /** Pièces moteur reliées à cet article. */
  linkedPartsCount: number
}

export interface InventoryMovementRow {
  id: number
  quantity: number
  reason: InventoryMovementReason
  unitCost: number | null
  note: string | null
  occurredAt: string
  userName: string | null
  maintenanceEventId: number | null
  purchaseOrderId: number | null
  purchaseOrderNumber: number | null
}

export interface SupplierRow {
  id: number
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  leadTimeDays: number | null
  notes: string | null
}

export interface PurchaseOrderLineRow {
  id: number
  inventoryItemId: number
  itemName: string
  unit: InventoryUnit
  quantity: number
  unitCost: number
}

export interface PurchaseOrderRow {
  id: number
  number: number
  status: PurchaseOrderStatus
  supplierId: number
  supplierName: string
  boatId: number | null
  boatName: string | null
  orderedOn: string | null
  receivedAt: string | null
  notes: string | null
  total: number
  lines: PurchaseOrderLineRow[]
}

export interface InventoryItemPayload {
  name: string
  reference?: string | null
  unit?: InventoryUnit
  minQuantity?: number | null
  location?: string | null
  supplierId?: number | null
  notes?: string | null
  /** Création seulement : stock initial, écrit comme un mouvement `adjustment`. */
  initialQuantity?: number | null
  /** Création seulement : prix d'achat unitaire du stock initial. */
  initialUnitCost?: number | null
}

export interface InventoryAdjustmentPayload {
  /** Quantité comptée en atelier : le mouvement écrit l'écart. */
  countedQuantity: number
  note?: string | null
}

export interface SupplierPayload {
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  leadTimeDays?: number | null
  notes?: string | null
}

export interface PurchaseOrderLinePayload {
  inventoryItemId: number
  quantity: number
  unitCost?: number | null
}

export interface PurchaseOrderPayload {
  supplierId: number
  boatId?: number | null
  notes?: string | null
  lines: PurchaseOrderLinePayload[]
}

export interface InventoryImportResult {
  itemsCreated: number
  partsLinked: number
}

export interface InventoryPageProps {
  items: InventoryItemRow[]
  suppliers: SupplierRow[]
  filters: { q: string; filter: InventoryFilter }
  lowCount: number
  /** Pièces moteur suivies en stock mais pas encore reliées (reprise possible). */
  unlinkedPartsCount: number
  canManage: boolean
  canDelete: boolean
}

export interface InventoryItemShowProps {
  item: InventoryItemRow
  movements: InventoryMovementRow[]
  linkedParts: {
    id: number
    designation: string
    boatId: number
    boatName: string
    engineId: number
  }[]
  suppliers: SupplierRow[]
  canManage: boolean
  canDelete: boolean
}

export interface PurchaseOrdersPageProps {
  orders: PurchaseOrderRow[]
  suppliers: SupplierRow[]
  items: Pick<InventoryItemRow, 'id' | 'name' | 'unit' | 'averageCost' | 'supplierId'>[]
  boats: { id: number; name: string }[]
  canManage: boolean
  canDelete: boolean
}

/** Article proposé au formulaire d'une pièce moteur. */
export interface InventoryItemOption {
  id: number
  name: string
  reference: string | null
  quantity: number
  unit: InventoryUnit
}

/** Ligne de bon de commande en cours de saisie (formulaire, valeurs brutes). */
export interface PurchaseOrderLineDraft {
  inventoryItemId: number | ''
  quantity: string
  unitCost: string
}
