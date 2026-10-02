import { SupplierInUseError, SupplierNotFoundError } from '#exceptions/inventory_errors'
import PurchaseOrder from '#models/purchase_order'
import Supplier from '#models/supplier'
import type { SupplierPayload, SupplierRow } from '#shared/types/inventory'
import { inject } from '@adonisjs/core'

/** Fournisseurs de pièces de l'organisation (#892). */
@inject()
export default class SupplierService {
  async list(organizationId: number): Promise<SupplierRow[]> {
    const suppliers = await Supplier.query()
      .where('organizationId', organizationId)
      .orderBy('name', 'asc')
    return suppliers.map((supplier) => this.toRow(supplier))
  }

  async find(organizationId: number, supplierId: number): Promise<Supplier> {
    const supplier = await Supplier.query()
      .where('id', supplierId)
      .where('organizationId', organizationId)
      .first()
    if (!supplier) throw new SupplierNotFoundError()
    return supplier
  }

  async create(organizationId: number, payload: SupplierPayload): Promise<Supplier> {
    return Supplier.create({ organizationId, ...this.#attributes(payload) })
  }

  async update(
    organizationId: number,
    supplierId: number,
    payload: SupplierPayload
  ): Promise<Supplier> {
    const supplier = await this.find(organizationId, supplierId)
    supplier.merge(this.#attributes(payload))
    await supplier.save()
    return supplier
  }

  /** Les bons de commande gardent leur fournisseur : un fournisseur commandé ne se supprime pas. */
  async delete(organizationId: number, supplierId: number): Promise<void> {
    const supplier = await this.find(organizationId, supplierId)
    const ordered = await PurchaseOrder.query().where('supplierId', supplier.id).first()
    if (ordered) throw new SupplierInUseError()
    await supplier.delete()
  }

  toRow(supplier: Supplier): SupplierRow {
    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      leadTimeDays: supplier.leadTimeDays,
      notes: supplier.notes,
    }
  }

  #attributes(payload: SupplierPayload) {
    return {
      name: payload.name.trim(),
      contactName: payload.contactName?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      leadTimeDays: payload.leadTimeDays ?? null,
      notes: payload.notes?.trim() || null,
    }
  }
}
