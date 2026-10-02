import {
  InventoryItemInUseError,
  InventoryItemNotFoundError,
  SupplierNotFoundError,
} from '#exceptions/inventory_errors'
import BoatEnginePart from '#models/boat_engine_part'
import InventoryItem from '#models/inventory_item'
import InventoryMovement from '#models/inventory_movement'
import PurchaseOrderLine from '#models/purchase_order_line'
import Supplier from '#models/supplier'
import type User from '#models/user'
import { INVENTORY_MOVEMENTS_LIMIT } from '#shared/constants/inventory'
import {
  adjustmentDelta,
  isInventoryLow,
  roundQuantity,
  stockValue,
  weightedAverageCost,
} from '#shared/helpers/inventory'
import type {
  InventoryAdjustmentPayload,
  InventoryFilter,
  InventoryImportResult,
  InventoryItemOption,
  InventoryItemPayload,
  InventoryItemRow,
  InventoryItemShowProps,
  InventoryMovementReason,
  InventoryMovementRow,
} from '#shared/types/inventory'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/** Prédicat SQL du stock bas — même règle que `isInventoryLow`. */
const LOW_SQL =
  'inventory_items.min_quantity is not null and inventory_items.quantity <= inventory_items.min_quantity'

/** Pièce moteur suivie en stock : un compteur ou un seuil a été saisi. */
const TRACKED_PART_SQL =
  '(boat_engine_parts.stock is not null or boat_engine_parts.min_stock_alert is not null)'

export interface MovementInput {
  item: InventoryItem
  quantity: number
  reason: InventoryMovementReason
  unitCost?: number | null
  maintenanceEventId?: number | null
  purchaseOrderId?: number | null
  userId?: number | null
  note?: string | null
}

/**
 * Stock central de l'organisation (#892). Toute variation de quantité passe
 * par `recordMovement`, qui verrouille l'article, écrit le mouvement et met à
 * jour quantité et prix moyen dans la même transaction : la quantité affichée
 * est toujours la somme du journal.
 */
@inject()
export default class InventoryService {
  /* --- Lecture ------------------------------------------------------------ */

  async list(
    organizationId: number,
    filters: { q: string; filter: InventoryFilter }
  ): Promise<InventoryItemRow[]> {
    const query = this.#rowsQuery(organizationId).orderBy('inventory_items.name', 'asc')
    if (filters.filter === 'low') query.whereRaw(LOW_SQL)
    if (filters.q) {
      const like = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`
      query.where((q) => {
        q.whereILike('inventory_items.name', like)
          .orWhereILike('inventory_items.reference', like)
          .orWhereILike('inventory_items.location', like)
      })
    }
    const items = await query
    return items.map((item) => this.toRow(item))
  }

  async find(organizationId: number, itemId: number): Promise<InventoryItem> {
    const item = await this.#rowsQuery(organizationId).where('inventory_items.id', itemId).first()
    if (!item) throw new InventoryItemNotFoundError()
    return item
  }

  async options(organizationId: number): Promise<InventoryItemOption[]> {
    const items = await InventoryItem.query()
      .where('organizationId', organizationId)
      .orderBy('name', 'asc')
      .select(['id', 'name', 'reference', 'quantity', 'unit'])
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      reference: item.reference,
      quantity: item.quantity,
      unit: item.unit,
    }))
  }

  async lowCount(organizationId: number): Promise<number> {
    const row = await db
      .from('inventory_items')
      .where('organization_id', organizationId)
      .whereRaw(LOW_SQL)
      .count('* as total')
      .first()
    return Number(row?.total ?? 0)
  }

  /** Pièces moteur suivies en stock, pas encore reliées : ce que la reprise importerait. */
  async unlinkedPartsCount(organizationId: number): Promise<number> {
    const row = await this.#unlinkedPartsQuery(organizationId).count('* as total').first()
    return Number(row?.total ?? 0)
  }

  async movements(item: InventoryItem): Promise<InventoryMovementRow[]> {
    const rows = await InventoryMovement.query()
      .where('inventoryItemId', item.id)
      .preload('user', (q) => q.select(['id', 'fullName', 'email']))
      .preload('purchaseOrder', (q) => q.select(['id', 'number']))
      .orderBy('occurredAt', 'desc')
      .orderBy('id', 'desc')
      .limit(INVENTORY_MOVEMENTS_LIMIT)
    return rows.map((m) => ({
      id: m.id,
      quantity: m.quantity,
      reason: m.reason,
      unitCost: m.unitCost,
      note: m.note,
      occurredAt: m.occurredAt.toISO() ?? '',
      userName: m.user ? m.user.fullName || m.user.email : null,
      maintenanceEventId: m.maintenanceEventId,
      purchaseOrderId: m.purchaseOrderId,
      purchaseOrderNumber: m.purchaseOrder?.number ?? null,
    }))
  }

  async linkedParts(item: InventoryItem): Promise<InventoryItemShowProps['linkedParts']> {
    const rows = await db
      .from('boat_engine_parts')
      .join('boat_engines', 'boat_engines.id', 'boat_engine_parts.boat_engine_id')
      .join('boats', 'boats.id', 'boat_engines.boat_id')
      .where('boat_engine_parts.inventory_item_id', item.id)
      .where('boats.organization_id', item.organizationId)
      .whereNull('boats.deleted_at')
      .orderBy('boats.name', 'asc')
      .select(
        'boat_engine_parts.id',
        'boat_engine_parts.designation',
        'boats.id as boat_id',
        'boats.name as boat_name',
        'boat_engines.id as engine_id'
      )
    return rows.map((row) => ({
      id: Number(row.id),
      designation: String(row.designation),
      boatId: Number(row.boat_id),
      boatName: String(row.boat_name),
      engineId: Number(row.engine_id),
    }))
  }

  toRow(item: InventoryItem): InventoryItemRow {
    return {
      id: item.id,
      name: item.name,
      reference: item.reference,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      location: item.location,
      averageCost: item.averageCost,
      stockValue: stockValue(item.quantity, item.averageCost),
      supplierId: item.supplierId,
      supplierName: item.supplier?.name ?? null,
      notes: item.notes,
      isLow: isInventoryLow(item.quantity, item.minQuantity),
      linkedPartsCount: Number(item.$extras.linked_parts ?? 0),
    }
  }

  /* --- Écriture ----------------------------------------------------------- */

  async create(user: User, payload: InventoryItemPayload): Promise<InventoryItem> {
    const organizationId = user.organizationId!
    await this.#assertSupplier(organizationId, payload.supplierId ?? null)

    return db.transaction(async (trx) => {
      const item = await InventoryItem.create(
        {
          organizationId,
          ...this.#attributes(payload),
          unit: payload.unit ?? 'unit',
          quantity: 0,
          averageCost: null,
        },
        { client: trx }
      )
      const initial = payload.initialQuantity ?? 0
      if (initial !== 0) {
        await this.recordMovement(trx, {
          item,
          quantity: initial,
          reason: 'adjustment',
          unitCost: payload.initialUnitCost ?? null,
          userId: user.id,
        })
      }
      return item
    })
  }

  async update(
    organizationId: number,
    itemId: number,
    payload: InventoryItemPayload
  ): Promise<InventoryItem> {
    const item = await this.find(organizationId, itemId)
    await this.#assertSupplier(organizationId, payload.supplierId ?? null)
    item.merge({ ...this.#attributes(payload), unit: payload.unit ?? item.unit })
    await item.save()
    return item
  }

  /**
   * Un article encore porté par un bon de commande ne se supprime pas : la
   * commande perdrait sa ligne. Les pièces moteur reliées sont déliées (FK
   * `SET NULL`) et retrouvent leur `stock` local.
   */
  async delete(organizationId: number, itemId: number): Promise<void> {
    const item = await this.find(organizationId, itemId)
    const used = await PurchaseOrderLine.query().where('inventoryItemId', item.id).first()
    if (used) throw new InventoryItemInUseError()
    await item.delete()
  }

  /** Inventaire tournant : on saisit la quantité comptée, le mouvement porte l'écart. */
  async adjust(
    user: User,
    itemId: number,
    payload: InventoryAdjustmentPayload
  ): Promise<{ item: InventoryItem; delta: number }> {
    const found = await this.find(user.organizationId!, itemId)
    return db.transaction(async (trx) => {
      const item = await InventoryItem.query({ client: trx })
        .where('id', found.id)
        .forUpdate()
        .firstOrFail()
      const delta = adjustmentDelta(item.quantity, payload.countedQuantity)
      if (delta !== 0) {
        await this.recordMovement(trx, {
          item,
          quantity: delta,
          reason: 'adjustment',
          userId: user.id,
          note: payload.note ?? null,
        })
      }
      return { item, delta }
    })
  }

  /**
   * Écrit un mouvement et répercute la quantité (et le prix moyen pour une
   * entrée valorisée). L'article doit être lu dans `trx` — idéalement
   * verrouillé : la ligne est relue `FOR UPDATE` ici de toute façon.
   */
  async recordMovement(
    trx: TransactionClientContract,
    input: MovementInput
  ): Promise<InventoryMovement> {
    const item = await InventoryItem.query({ client: trx })
      .where('id', input.item.id)
      .forUpdate()
      .firstOrFail()

    const quantity = roundQuantity(input.quantity)
    const unitCost = input.unitCost ?? null
    if (quantity > 0 && unitCost !== null && input.reason !== 'return') {
      item.averageCost = weightedAverageCost(item.quantity, item.averageCost, quantity, unitCost)
    }
    item.quantity = roundQuantity(item.quantity + quantity)
    item.useTransaction(trx)
    await item.save()
    input.item.quantity = item.quantity
    input.item.averageCost = item.averageCost

    return InventoryMovement.create(
      {
        organizationId: item.organizationId,
        inventoryItemId: item.id,
        quantity,
        reason: input.reason,
        unitCost,
        maintenanceEventId: input.maintenanceEventId ?? null,
        purchaseOrderId: input.purchaseOrderId ?? null,
        userId: input.userId ?? null,
        note: input.note ?? null,
        occurredAt: DateTime.now(),
      },
      { client: trx }
    )
  }

  /**
   * Sortie de stock d'un entretien : pour chaque pièce moteur reliée à un
   * article de l'organisation, un mouvement `consumption`. Retourne les pièces
   * traitées : leur `stock` local ne doit plus être décrémenté (il ne fait
   * plus foi tant que la pièce est reliée).
   */
  async consumeForMaintenance(
    trx: TransactionClientContract,
    params: {
      organizationId: number
      maintenanceEventId: number
      userId: number | null
      parts: { enginePartId: number; quantity: number }[]
    }
  ): Promise<Set<number>> {
    const handled = new Set<number>()
    if (params.parts.length === 0) return handled

    const linked = await BoatEnginePart.query({ client: trx })
      .whereIn(
        'id',
        params.parts.map((p) => p.enginePartId)
      )
      .whereNotNull('inventoryItemId')
      .preload('inventoryItem')
    const byId = new Map(linked.map((part) => [part.id, part]))

    for (const used of params.parts) {
      const part = byId.get(used.enginePartId)
      const item = part?.inventoryItem
      if (!part || !item || item.organizationId !== params.organizationId) continue
      await this.recordMovement(trx, {
        item,
        quantity: -used.quantity,
        reason: 'consumption',
        maintenanceEventId: params.maintenanceEventId,
        userId: params.userId,
        note: part.designation,
      })
      handled.add(part.id)
    }
    return handled
  }

  /**
   * Suppression d'un entretien : les sorties qu'il a écrites reviennent en
   * stock (mouvement `return`), sans quoi supprimer une saisie erronée
   * laisserait un trou dans l'inventaire.
   */
  async reverseForMaintenance(
    trx: TransactionClientContract,
    maintenanceEventId: number,
    userId: number | null
  ): Promise<void> {
    const movements = await InventoryMovement.query({ client: trx })
      .where('maintenanceEventId', maintenanceEventId)
      .preload('item')
    const netByItem = new Map<number, { item: InventoryItem; quantity: number }>()
    for (const movement of movements) {
      const entry = netByItem.get(movement.inventoryItemId) ?? {
        item: movement.item,
        quantity: 0,
      }
      entry.quantity = roundQuantity(entry.quantity + movement.quantity)
      netByItem.set(movement.inventoryItemId, entry)
    }
    for (const { item, quantity } of netByItem.values()) {
      if (quantity === 0) continue
      await this.recordMovement(trx, {
        item,
        quantity: -quantity,
        reason: 'return',
        maintenanceEventId,
        userId,
      })
    }
  }

  /**
   * Reprise des stocks par moteur (#892) : les pièces moteur suivies en stock
   * et pas encore reliées sont regroupées par référence (à défaut par
   * désignation), un article est créé par groupe et les pièces y sont reliées.
   *
   * - quantité initiale = **somme** des stocks moteur du groupe, écrite comme
   *   un mouvement `adjustment` annoté — à vérifier par un inventaire tournant
   *   si les compteurs par moteur désignaient le même carton ;
   * - seuil = le plus élevé des seuils du groupe ; prix moyen = moyenne des
   *   prix d'achat renseignés.
   *
   * Le `stock` local des pièces n'est jamais modifié : délier une pièce le
   * restitue tel quel. Idempotente : une pièce déjà reliée n'est pas reprise.
   */
  async importFromEngineParts(user: User, note: string): Promise<InventoryImportResult> {
    const organizationId = user.organizationId!
    return db.transaction(async (trx) => {
      const parts = await this.#unlinkedPartsQuery(organizationId, trx)
        .select(
          'boat_engine_parts.id',
          'boat_engine_parts.designation',
          'boat_engine_parts.reference',
          'boat_engine_parts.stock',
          'boat_engine_parts.min_stock_alert',
          'boat_engine_parts.purchase_price'
        )
        .orderBy('boat_engine_parts.id', 'asc')

      const groups = new Map<string, typeof parts>()
      for (const part of parts) {
        const key = String(part.reference || part.designation)
          .trim()
          .toLowerCase()
        groups.set(key, [...(groups.get(key) ?? []), part])
      }

      let partsLinked = 0
      for (const group of groups.values()) {
        const [first] = group
        const thresholds = group
          .map((p) => p.min_stock_alert)
          .filter((v): v is number => v !== null)
        const prices = group
          .map((p) => (p.purchase_price === null ? null : Number(p.purchase_price)))
          .filter((v): v is number => v !== null)
        const quantity = group.reduce((sum, p) => sum + Number(p.stock ?? 0), 0)

        const item = await InventoryItem.create(
          {
            organizationId,
            name: String(first.designation),
            reference: first.reference ?? null,
            unit: 'unit',
            quantity: 0,
            minQuantity: thresholds.length > 0 ? Math.max(...thresholds) : null,
            averageCost: null,
          },
          { client: trx }
        )
        if (quantity !== 0) {
          await this.recordMovement(trx, {
            item,
            quantity,
            reason: 'adjustment',
            unitCost: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
            userId: user.id,
            note,
          })
        }
        await BoatEnginePart.query({ client: trx })
          .whereIn(
            'id',
            group.map((p) => Number(p.id))
          )
          .update({ inventoryItemId: item.id })
        partsLinked += group.length
      }
      return { itemsCreated: groups.size, partsLinked }
    })
  }

  /** Vérifie qu'un article (pour lier une pièce moteur) appartient à l'organisation. */
  async assertInOrganization(organizationId: number, itemId: number | null): Promise<void> {
    if (itemId === null) return
    const item = await InventoryItem.query()
      .where('id', itemId)
      .where('organizationId', organizationId)
      .first()
    if (!item) throw new InventoryItemNotFoundError()
  }

  /* --- Internes ----------------------------------------------------------- */

  #rowsQuery(organizationId: number) {
    return InventoryItem.query()
      .where('inventory_items.organization_id', organizationId)
      .select('inventory_items.*')
      .select(
        db.raw(
          '(select count(*) from boat_engine_parts where boat_engine_parts.inventory_item_id = inventory_items.id) as linked_parts'
        )
      )
      .preload('supplier', (q) => q.select(['id', 'name']))
  }

  #unlinkedPartsQuery(organizationId: number, trx?: TransactionClientContract) {
    return (trx ?? db)
      .from('boat_engine_parts')
      .join('boat_engines', 'boat_engines.id', 'boat_engine_parts.boat_engine_id')
      .join('boats', 'boats.id', 'boat_engines.boat_id')
      .where('boats.organization_id', organizationId)
      .whereNull('boats.deleted_at')
      .whereNull('boat_engine_parts.inventory_item_id')
      .whereRaw(TRACKED_PART_SQL)
  }

  async #assertSupplier(organizationId: number, supplierId: number | null): Promise<void> {
    if (supplierId === null) return
    const supplier = await Supplier.query()
      .where('id', supplierId)
      .where('organizationId', organizationId)
      .first()
    if (!supplier) throw new SupplierNotFoundError()
  }

  #attributes(payload: InventoryItemPayload) {
    return {
      name: payload.name.trim(),
      reference: payload.reference?.trim() || null,
      minQuantity: payload.minQuantity ?? null,
      location: payload.location?.trim() || null,
      supplierId: payload.supplierId ?? null,
      notes: payload.notes?.trim() || null,
    }
  }
}
