import { SupplierInUseError, SupplierNotFoundError } from '#exceptions/inventory_errors'
import InventoryPolicy from '#policies/inventory_policy'
import SupplierService from '#services/supplier_service'
import { supplierValidator } from '#validators/inventory'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/** Fournisseurs de pièces (#892), gérés depuis l'inventaire et les bons de commande. */
@inject()
export default class SuppliersController {
  constructor(private supplierService: SupplierService) {}

  async store({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(supplierValidator)

    await this.supplierService.create(user.organizationId!, payload)
    session.flash('success', i18n.t('flash.inventory.supplierCreated'))
    return response.redirect().back()
  }

  async update({ auth, bouncer, request, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('manage')
    const payload = await request.validateUsing(supplierValidator)

    try {
      await this.supplierService.update(user.organizationId!, Number(params.id), payload)
    } catch (error) {
      if (error instanceof SupplierNotFoundError) {
        session.flash('error', i18n.t('flash.inventory.supplierNotFound'))
        return response.redirect().back()
      }
      throw error
    }
    session.flash('success', i18n.t('flash.inventory.supplierUpdated'))
    return response.redirect().back()
  }

  async destroy({ auth, bouncer, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(InventoryPolicy).authorize('delete')

    try {
      await this.supplierService.delete(user.organizationId!, Number(params.id))
    } catch (error) {
      if (error instanceof SupplierNotFoundError) {
        session.flash('error', i18n.t('flash.inventory.supplierNotFound'))
        return response.redirect().back()
      }
      if (error instanceof SupplierInUseError) {
        session.flash('error', i18n.t('flash.inventory.supplierInUse'))
        return response.redirect().back()
      }
      throw error
    }
    session.flash('success', i18n.t('flash.inventory.supplierDeleted'))
    return response.redirect().back()
  }
}
