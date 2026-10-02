import {
  InventoryItemNotFoundError,
  NothingToReorderError,
  PurchaseOrderBoatNotFoundError,
  PurchaseOrderNotFoundError,
  PurchaseOrderTransitionError,
} from '#exceptions/inventory_errors'
import Boat from '#models/boat'
import BoatBudgetEntry from '#models/boat_budget_entry'
import InventoryItem from '#models/inventory_item'
import PurchaseOrder from '#models/purchase_order'
import PurchaseOrderLine from '#models/purchase_order_line'
import type User from '#models/user'
import InventoryService from '#services/inventory_service'
import SupplierService from '#services/supplier_service'
import { purchaseOrderTotal, suggestedReorderQuantity } from '#shared/helpers/inventory'
import type {
  PurchaseOrderPayload,
  PurchaseOrderRow,
  PurchaseOrderStatus,
} from '#shared/types/inventory'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/**
 * Bons de commande fournisseur (#892). Seul un brouillon se modifie ; la
 * réception est le seul geste qui touche au stock (mouvements `purchase`, prix
 * moyen) et au budget (une dépense sur le bateau d'affectation, s'il y en a un).
 */
@inject()
export default class PurchaseOrderService {
  constructor(
    private inventoryService: InventoryService,
    private supplierService: SupplierService
  ) {}

  async list(organizationId: number): Promise<PurchaseOrderRow[]> {
    const orders = await this.#query(organizationId)
      .orderByRaw("case when status in ('draft', 'sent') then 0 else 1 end")
      .orderBy('number', 'desc')
    return orders.map((order) => this.toRow(order))
  }

  async find(organizationId: number, orderId: number): Promise<PurchaseOrder> {
    const order = await this.#query(organizationId).where('id', orderId).first()
    if (!order) throw new PurchaseOrderNotFoundError()
    return order
  }

  async create(user: User, payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
    const organizationId = user.organizationId!
    await this.#assertReferences(organizationId, payload)

    const orderId = await db.transaction(async (trx) => {
      const order = await PurchaseOrder.create(
        {
          organizationId,
          number: await this.#nextNumber(trx, organizationId),
          supplierId: payload.supplierId,
          boatId: payload.boatId ?? null,
          status: 'draft',
          createdBy: user.id,
          notes: payload.notes?.trim() || null,
        },
        { client: trx }
      )
      await this.#writeLines(trx, order, payload)
      return order.id
    })
    return this.find(organizationId, orderId)
  }

  async update(
    organizationId: number,
    orderId: number,
    payload: PurchaseOrderPayload
  ): Promise<PurchaseOrder> {
    const order = await this.find(organizationId, orderId)
    this.#assertStatus(order, ['draft'], 'update')
    await this.#assertReferences(organizationId, payload)

    await db.transaction(async (trx) => {
      order.useTransaction(trx)
      order.merge({
        supplierId: payload.supplierId,
        boatId: payload.boatId ?? null,
        notes: payload.notes?.trim() || null,
      })
      await order.save()
      await PurchaseOrderLine.query({ client: trx }).where('purchaseOrderId', order.id).delete()
      await this.#writeLines(trx, order, payload)
    })
    return this.find(organizationId, orderId)
  }

  /**
   * Brouillon prérempli depuis les alertes de stock bas : les articles sous
   * leur seuil dont c'est le fournisseur habituel, à la quantité qui les
   * remonte au double du seuil, au dernier prix moyen connu.
   */
  async createFromLowStock(user: User, supplierId: number): Promise<PurchaseOrder> {
    const organizationId = user.organizationId!
    await this.supplierService.find(organizationId, supplierId)
    const items = await InventoryItem.query()
      .where('organizationId', organizationId)
      .where('supplierId', supplierId)
      .whereNotNull('minQuantity')
      .whereRaw('quantity <= min_quantity')
      .orderBy('name', 'asc')
    if (items.length === 0) throw new NothingToReorderError()

    return this.create(user, {
      supplierId,
      lines: items.map((item) => ({
        inventoryItemId: item.id,
        quantity: suggestedReorderQuantity(item.quantity, item.minQuantity),
        unitCost: item.averageCost,
      })),
    })
  }

  async send(organizationId: number, orderId: number): Promise<PurchaseOrder> {
    const order = await this.find(organizationId, orderId)
    this.#assertStatus(order, ['draft'], 'send')
    order.status = 'sent'
    order.orderedOn = DateTime.now().startOf('day')
    await order.save()
    return order
  }

  async cancel(organizationId: number, orderId: number): Promise<PurchaseOrder> {
    const order = await this.find(organizationId, orderId)
    this.#assertStatus(order, ['draft', 'sent'], 'cancel')
    order.status = 'cancelled'
    await order.save()
    return order
  }

  /** Seuls un brouillon ou un bon annulé se suppriment : un bon reçu a écrit du stock. */
  async delete(organizationId: number, orderId: number): Promise<void> {
    const order = await this.find(organizationId, orderId)
    this.#assertStatus(order, ['draft', 'cancelled'], 'delete')
    await order.delete()
  }

  /**
   * Réception : un mouvement `purchase` par ligne (prix moyen recalculé), puis,
   * si le bon est affecté à un bateau, une dépense « entretien » de son
   * montant au budget de ce bateau. Le bon est verrouillé : deux clics ne
   * reçoivent pas deux fois la marchandise.
   */
  async receive(
    user: User,
    orderId: number,
    budgetLabel: (order: PurchaseOrder) => string
  ): Promise<PurchaseOrder> {
    const organizationId = user.organizationId!
    await this.find(organizationId, orderId)

    await db.transaction(async (trx) => {
      const order = await PurchaseOrder.query({ client: trx })
        .where('id', orderId)
        .where('organizationId', organizationId)
        .forUpdate()
        .firstOrFail()
      this.#assertStatus(order, ['draft', 'sent'], 'receive')
      await order.load('lines', (q) => q.preload('item'))
      await order.load('supplier')

      for (const line of order.lines) {
        await this.inventoryService.recordMovement(trx, {
          item: line.item,
          quantity: line.quantity,
          reason: 'purchase',
          unitCost: line.unitCost,
          purchaseOrderId: order.id,
          userId: user.id,
        })
      }

      const total = purchaseOrderTotal(order.lines)
      if (order.boatId !== null && total > 0) {
        const entry = await BoatBudgetEntry.create(
          {
            boatId: order.boatId,
            amount: String(total),
            date: DateTime.now().startOf('day'),
            label: budgetLabel(order),
            category: 'maintenance',
            description: null,
            visibleToOwner: false,
          },
          { client: trx }
        )
        order.budgetEntryId = entry.id
      }

      order.status = 'received'
      order.receivedAt = DateTime.now()
      order.orderedOn = order.orderedOn ?? DateTime.now().startOf('day')
      await order.save()
    })
    return this.find(organizationId, orderId)
  }

  toRow(order: PurchaseOrder): PurchaseOrderRow {
    const lines = order.lines.map((line) => ({
      id: line.id,
      inventoryItemId: line.inventoryItemId,
      itemName: line.item?.name ?? `#${line.inventoryItemId}`,
      unit: line.item?.unit ?? 'unit',
      quantity: line.quantity,
      unitCost: line.unitCost,
    }))
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      supplierId: order.supplierId,
      supplierName: order.supplier?.name ?? '',
      boatId: order.boatId,
      boatName: order.boat?.name ?? null,
      orderedOn: order.orderedOn?.toISODate() ?? null,
      receivedAt: order.receivedAt?.toISO() ?? null,
      notes: order.notes,
      total: purchaseOrderTotal(lines),
      lines,
    }
  }

  /* --- Internes ----------------------------------------------------------- */

  #query(organizationId: number) {
    return PurchaseOrder.query()
      .where('organizationId', organizationId)
      .preload('supplier', (q) => q.select(['id', 'name']))
      .preload('boat', (q) => q.select(['id', 'name']))
      .preload('lines', (q) =>
        q.preload('item', (i) => i.select(['id', 'name', 'unit'])).orderBy('id', 'asc')
      )
  }

  #assertStatus(order: PurchaseOrder, allowed: PurchaseOrderStatus[], action: string): void {
    if (!allowed.includes(order.status)) {
      throw new PurchaseOrderTransitionError(order.status, action)
    }
  }

  /** Numéro séquentiel par organisation, sous verrou consultatif de transaction. */
  async #nextNumber(trx: TransactionClientContract, organizationId: number): Promise<number> {
    await trx.rawQuery('select pg_advisory_xact_lock(?, ?)', [892, organizationId])
    const row = await trx
      .from('purchase_orders')
      .where('organization_id', organizationId)
      .max('number as last')
      .first()
    return Number(row?.last ?? 0) + 1
  }

  async #assertReferences(organizationId: number, payload: PurchaseOrderPayload): Promise<void> {
    await this.supplierService.find(organizationId, payload.supplierId)
    if (payload.boatId) {
      const boat = await Boat.query()
        .where('id', payload.boatId)
        .where('organizationId', organizationId)
        .whereNull('deletedAt')
        .first()
      if (!boat) throw new PurchaseOrderBoatNotFoundError()
    }
    const ids = [...new Set(payload.lines.map((line) => line.inventoryItemId))]
    const found = await InventoryItem.query()
      .whereIn('id', ids)
      .where('organizationId', organizationId)
      .select(['id'])
    if (found.length !== ids.length) throw new InventoryItemNotFoundError()
  }

  async #writeLines(
    trx: TransactionClientContract,
    order: PurchaseOrder,
    payload: PurchaseOrderPayload
  ): Promise<void> {
    const items = await InventoryItem.query({ client: trx })
      .whereIn(
        'id',
        payload.lines.map((line) => line.inventoryItemId)
      )
      .select(['id', 'averageCost'])
    const averages = new Map(items.map((item) => [item.id, item.averageCost]))
    await PurchaseOrderLine.createMany(
      payload.lines.map((line) => ({
        purchaseOrderId: order.id,
        inventoryItemId: line.inventoryItemId,
        quantity: line.quantity,
        unitCost: line.unitCost ?? averages.get(line.inventoryItemId) ?? 0,
      })),
      { client: trx }
    )
  }
}
