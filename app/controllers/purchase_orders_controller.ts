import {
  InventoryItemNotFoundError,
  NothingToReorderError,
  PurchaseOrderBoatNotFoundError,
  PurchaseOrderNotFoundError,
  PurchaseOrderTransitionError,
  SupplierNotFoundError,
} from '#exceptions/inventory_errors'
import type PurchaseOrder from '#models/purchase_order'
import type User from '#models/user'
import InventoryPolicy from '#policies/inventory_policy'
import AuditLogService from '#services/audit_log_service'
import BoatListService from '#services/boat_list_service'
import InventoryService from '#services/inventory_service'
import PurchaseOrderService from '#services/purchase_order_service'
import SupplierService from '#services/supplier_service'
import type { AuditAction } from '#shared/types/audit_log'
import type { PurchaseOrdersPageProps } from '#shared/types/inventory'
import { purchaseOrderValidator, reorderValidator } from '#validators/inventory'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

const INDEX = '/inventory/orders'

/** Bons de commande fournisseur (#892) : brouillon → envoyé → réceptionné. */
@inject()
export default class PurchaseOrdersController {
  constructor(
    private orderService: PurchaseOrderService,
    private inventoryService: InventoryService,
    private supplierService: SupplierService,
    private boatListService: BoatListService,
    private auditLogService: AuditLogService
  ) {}

  async index({ inertia, auth, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('view')
    const organizationId = user.organizationId!

    const [orders, suppliers, items, boats, canManage, canDelete] = await Promise.all([
      this.orderService.list(organizationId),
      this.supplierService.list(organizationId),
      this.inventoryService.list(organizationId, { q: '', filter: 'all' }),
      this.boatListService.listNamesForOrg(user),
      bouncer.with(InventoryPolicy).allows('manage'),
      bouncer.with(InventoryPolicy).allows('delete'),
    ])

    const props: PurchaseOrdersPageProps = {
      orders,
      suppliers,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        averageCost: item.averageCost,
        supplierId: item.supplierId,
      })),
      boats,
      canManage,
      canDelete,
    }
    return inertia.render('inventory/orders', { ...props })
  }

  async store(ctx: HttpContext) {
    const { auth, bouncer, request } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(purchaseOrderValidator)

    return this.#run(ctx, 'created', async () => {
      const order = await this.orderService.create(user, payload)
      await this.#audit(user, 'purchase_order.create', order)
    })
  }

  /** `POST /inventory/orders/reorder` — brouillon prérempli depuis les stocks bas d'un fournisseur. */
  async reorder(ctx: HttpContext) {
    const { auth, bouncer, request } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const { supplierId } = await request.validateUsing(reorderValidator)

    return this.#run(ctx, 'created', async () => {
      const order = await this.orderService.createFromLowStock(user, supplierId)
      await this.#audit(user, 'purchase_order.create', order)
    })
  }

  async update(ctx: HttpContext) {
    const { auth, bouncer, request, params } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(purchaseOrderValidator)

    return this.#run(ctx, 'updated', async () => {
      await this.orderService.update(user.organizationId!, Number(params.id), payload)
    })
  }

  async send(ctx: HttpContext) {
    const { auth, bouncer, params } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')

    return this.#run(ctx, 'sent', async () => {
      const order = await this.orderService.send(user.organizationId!, Number(params.id))
      await this.#audit(user, 'purchase_order.send', order)
    })
  }

  async receive(ctx: HttpContext) {
    const { auth, bouncer, params, i18n } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')

    return this.#run(ctx, 'received', async () => {
      const order = await this.orderService.receive(user, Number(params.id), (o) =>
        i18n.t('inventory.orders.budgetLabel', {
          number: String(o.number),
          supplier: o.supplier.name,
        })
      )
      await this.#audit(user, 'purchase_order.receive', order)
    })
  }

  async cancel(ctx: HttpContext) {
    const { auth, bouncer, params } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')

    return this.#run(ctx, 'cancelled', async () => {
      const order = await this.orderService.cancel(user.organizationId!, Number(params.id))
      await this.#audit(user, 'purchase_order.cancel', order)
    })
  }

  async destroy(ctx: HttpContext) {
    const { auth, bouncer, params } = ctx
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('delete')

    return this.#run(ctx, 'deleted', async () => {
      const order = await this.orderService.find(user.organizationId!, Number(params.id))
      await this.orderService.delete(user.organizationId!, order.id)
      await this.#audit(user, 'purchase_order.delete', order)
    })
  }

  /** Exécute le geste et traduit les erreurs métier en flash ; redirige toujours vers la liste. */
  async #run(
    { response, session, i18n }: HttpContext,
    successKey: string,
    action: () => Promise<void>
  ) {
    try {
      await action()
    } catch (error) {
      const key = this.#errorKey(error)
      if (key === null) throw error
      session.flash('error', i18n.t(key))
      return response.redirect(INDEX)
    }
    session.flash('success', i18n.t(`flash.purchaseOrder.${successKey}`))
    return response.redirect(INDEX)
  }

  #errorKey(error: unknown): string | null {
    if (error instanceof PurchaseOrderNotFoundError) return 'flash.purchaseOrder.notFound'
    if (error instanceof PurchaseOrderTransitionError) return 'flash.purchaseOrder.invalidStatus'
    if (error instanceof PurchaseOrderBoatNotFoundError) return 'flash.purchaseOrder.boatNotFound'
    if (error instanceof NothingToReorderError) return 'flash.purchaseOrder.nothingToReorder'
    if (error instanceof SupplierNotFoundError) return 'flash.inventory.supplierNotFound'
    if (error instanceof InventoryItemNotFoundError) return 'flash.inventory.itemNotFound'
    return null
  }

  async #audit(user: User, action: AuditAction, order: PurchaseOrder) {
    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action,
      entityType: 'purchase_order',
      entityId: order.id,
      metadata: { number: order.number, supplierId: order.supplierId, status: order.status },
    })
  }
}
