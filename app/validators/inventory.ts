import vine from '@vinejs/vine'
import {
  INVENTORY_FILTERS,
  INVENTORY_UNITS,
  PURCHASE_ORDER_MAX_LINES,
} from '#shared/constants/inventory'

const quantity = () => vine.number().min(-9_999_999).max(9_999_999).decimal([0, 2])
const positiveQuantity = () => vine.number().positive().max(9_999_999).decimal([0, 2])
const money = () => vine.number().min(0).max(9_999_999).decimal([0, 2])
const optionalText = (max: number) => vine.string().trim().maxLength(max).nullable().optional()

/** Article du stock central (#892). L'organisation vient de la session, jamais du corps. */
export const inventoryItemValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(200),
    reference: optionalText(100),
    unit: vine.enum(INVENTORY_UNITS).optional(),
    minQuantity: money().nullable().optional(),
    location: optionalText(150),
    supplierId: vine.number().positive().withoutDecimals().nullable().optional(),
    notes: optionalText(2000),
    initialQuantity: quantity().nullable().optional(),
    initialUnitCost: money().nullable().optional(),
  })
)

/** Inventaire tournant : la quantité comptée, jamais négative. */
export const inventoryAdjustmentValidator = vine.create(
  vine.object({
    countedQuantity: money(),
    note: optionalText(500),
  })
)

export const inventoryQueryValidator = vine.create(
  vine.object({
    q: vine.string().trim().maxLength(100).optional(),
    filter: vine.enum(INVENTORY_FILTERS).optional(),
  })
)

export const supplierValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(150),
    contactName: optionalText(150),
    email: vine.string().trim().email().maxLength(255).nullable().optional(),
    phone: optionalText(50),
    leadTimeDays: vine.number().min(0).max(365).withoutDecimals().nullable().optional(),
    notes: optionalText(2000),
  })
)

export const purchaseOrderValidator = vine.create(
  vine.object({
    supplierId: vine.number().positive().withoutDecimals(),
    boatId: vine.number().positive().withoutDecimals().nullable().optional(),
    notes: optionalText(2000),
    lines: vine
      .array(
        vine.object({
          inventoryItemId: vine.number().positive().withoutDecimals(),
          quantity: positiveQuantity(),
          unitCost: money().nullable().optional(),
        })
      )
      .minLength(1)
      .maxLength(PURCHASE_ORDER_MAX_LINES),
  })
)

export const reorderValidator = vine.create(
  vine.object({
    supplierId: vine.number().positive().withoutDecimals(),
  })
)
