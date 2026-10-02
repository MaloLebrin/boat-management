import {
  InventoryItemInUseError,
  InventoryItemNotFoundError,
  SupplierNotFoundError,
} from '#exceptions/inventory_errors'
import InventoryPolicy from '#policies/inventory_policy'
import AuditLogService from '#services/audit_log_service'
import InventoryService from '#services/inventory_service'
import SupplierService from '#services/supplier_service'
import type {
  InventoryFilter,
  InventoryItemShowProps,
  InventoryPageProps,
} from '#shared/types/inventory'
import {
  inventoryAdjustmentValidator,
  inventoryItemValidator,
  inventoryQueryValidator,
} from '#validators/inventory'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

const INDEX = '/inventory'

/**
 * Stock central de pièces (#892) — plans Pro et Entreprise
 * (`requireModulePlan({ feature: 'inventory' })` sur tout le groupe).
 */
@inject()
export default class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private supplierService: SupplierService,
    private auditLogService: AuditLogService
  ) {}

  async index({ inertia, auth, bouncer, request }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('view')
    const organizationId = user.organizationId!

    const query = await request.validateUsing(inventoryQueryValidator)
    const filters = { q: query.q ?? '', filter: (query.filter ?? 'all') as InventoryFilter }

    const [items, suppliers, lowCount, unlinkedPartsCount, canManage, canDelete] =
      await Promise.all([
        this.inventoryService.list(organizationId, filters),
        this.supplierService.list(organizationId),
        this.inventoryService.lowCount(organizationId),
        this.inventoryService.unlinkedPartsCount(organizationId),
        bouncer.with(InventoryPolicy).allows('manage'),
        bouncer.with(InventoryPolicy).allows('delete'),
      ])

    const props: InventoryPageProps = {
      items,
      suppliers,
      filters,
      lowCount,
      unlinkedPartsCount,
      canManage,
      canDelete,
    }
    return inertia.render('inventory/index', { ...props })
  }

  async show({ inertia, auth, bouncer, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('view')
    const organizationId = user.organizationId!

    let item
    try {
      item = await this.inventoryService.find(organizationId, Number(params.id))
    } catch (error) {
      if (error instanceof InventoryItemNotFoundError) {
        session.flash('error', i18n.t('flash.inventory.itemNotFound'))
        return response.redirect(INDEX)
      }
      throw error
    }

    const [movements, linkedParts, suppliers, canManage, canDelete] = await Promise.all([
      this.inventoryService.movements(item),
      this.inventoryService.linkedParts(item),
      this.supplierService.list(organizationId),
      bouncer.with(InventoryPolicy).allows('manage'),
      bouncer.with(InventoryPolicy).allows('delete'),
    ])

    const props: InventoryItemShowProps = {
      item: this.inventoryService.toRow(item),
      movements,
      linkedParts,
      suppliers,
      canManage,
      canDelete,
    }
    return inertia.render('inventory/show', { ...props })
  }

  async store({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(inventoryItemValidator)

    try {
      await this.inventoryService.create(user, payload)
    } catch (error) {
      if (this.#flashKnown(error, session, i18n)) return response.redirect().back()
      throw error
    }
    session.flash('success', i18n.t('flash.inventory.itemCreated'))
    return response.redirect().back()
  }

  async update({ auth, bouncer, request, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(inventoryItemValidator)

    try {
      await this.inventoryService.update(user.organizationId!, Number(params.id), payload)
    } catch (error) {
      if (this.#flashKnown(error, session, i18n)) return response.redirect().back()
      throw error
    }
    session.flash('success', i18n.t('flash.inventory.itemUpdated'))
    return response.redirect().back()
  }

  async destroy({ auth, bouncer, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('delete')

    try {
      await this.inventoryService.delete(user.organizationId!, Number(params.id))
    } catch (error) {
      if (this.#flashKnown(error, session, i18n)) return response.redirect().back()
      throw error
    }
    session.flash('success', i18n.t('flash.inventory.itemDeleted'))
    return response.redirect(INDEX)
  }

  /** `POST /inventory/:id/adjust` — inventaire tournant (quantité comptée). */
  async adjust({ auth, bouncer, request, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(inventoryAdjustmentValidator)

    let result
    try {
      result = await this.inventoryService.adjust(user, Number(params.id), payload)
    } catch (error) {
      if (this.#flashKnown(error, session, i18n)) return response.redirect().back()
      throw error
    }

    if (result.delta !== 0) {
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'inventory.adjust',
        entityType: 'inventory_item',
        entityId: result.item.id,
        metadata: {
          name: result.item.name,
          delta: result.delta,
          quantity: result.item.quantity,
          note: payload.note ?? null,
        },
      })
    }
    session.flash(
      'success',
      i18n.t(result.delta === 0 ? 'flash.inventory.adjustUnchanged' : 'flash.inventory.adjusted')
    )
    return response.redirect().back()
  }

  /** `POST /inventory/import-engine-parts` — reprise des stocks par moteur. */
  async importEngineParts({ auth, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')

    const result = await this.inventoryService.importFromEngineParts(
      user,
      i18n.t('inventory.import.movementNote')
    )
    if (result.itemsCreated > 0) {
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'inventory.import',
        metadata: { ...result },
      })
    }
    session.flash(
      'success',
      i18n.t('flash.inventory.imported', {
        items: String(result.itemsCreated),
        parts: String(result.partsLinked),
      })
    )
    return response.redirect(INDEX)
  }

  #flashKnown(error: unknown, session: HttpContext['session'], i18n: HttpContext['i18n']): boolean {
    if (error instanceof InventoryItemNotFoundError) {
      session.flash('error', i18n.t('flash.inventory.itemNotFound'))
      return true
    }
    if (error instanceof SupplierNotFoundError) {
      session.flash('error', i18n.t('flash.inventory.supplierNotFound'))
      return true
    }
    if (error instanceof InventoryItemInUseError) {
      session.flash('error', i18n.t('flash.inventory.itemInUse'))
      return true
    }
    return false
  }
}
