import vine from '@vinejs/vine'
import { GENERIC_EQUIPMENT_CATEGORIES } from '#shared/types/boat'

const genericEquipmentPayload = vine.object({
  category: vine.enum(GENERIC_EQUIPMENT_CATEGORIES),
  name: vine.string().trim().minLength(1).maxLength(200),
  // `maxLength(120)` aligné sur `brand`/`model` du validator moteur
  // (`app/validators/boat_equipment.ts`), `notes` sur son plafond de 5000.
  brand: vine.string().trim().maxLength(120).nullable().optional(),
  model: vine.string().trim().maxLength(120).nullable().optional(),
  // Rattachement au catalogue d'équipements (#577), posé par la combobox du
  // formulaire. Volontairement une simple chaîne : le champ est masqué, une
  // valeur aberrante doit se neutraliser en `null` plutôt que faire échouer la
  // saisie — `brand` et `model` restent la source de vérité.
  equipmentModelId: vine.string().trim().optional(),
  quantity: vine.number().withoutDecimals().positive().nullable().optional(),
  status: vine.enum(['ok', 'to_check', 'to_replace']).optional(),
  notes: vine.string().trim().maxLength(5000).nullable().optional(),
  purchasePrice: vine.number().positive().decimal([0, 2]).nullable().optional(),
  purchasedAt: vine.string().trim().optional(),
})

export const createGenericEquipmentValidator = vine.create(genericEquipmentPayload)

export const updateGenericEquipmentValidator = vine.create(genericEquipmentPayload)

/**
 * Identifiant de ligne du catalogue : entier strictement positif, `null` sinon.
 * Une valeur absente ou aberrante ne casse pas la saisie — l'équipement reste
 * simplement non rattaché, ce qui est un état parfaitement valide.
 */
export function parseEquipmentCatalogId(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}
