import { PLAN_ADDONS, PLAN_MODULES } from '#shared/types/plan'
import vine from '@vinejs/vine'

/** Plafond de quantité d'un add-on quantitatif (garde-fou anti-saisie aberrante). */
export const MAX_ADDON_QUANTITY = 100

export const checkoutValidator = vine.create(
  vine.object({
    planTier: vine.enum(['pro', 'enterprise'] as const),
    interval: vine.enum(['month', 'year'] as const),
    // Modules add-ons optionnels souscrits à la souscription (épic #327).
    // Le contrôleur vérifie qu'ils ne sont demandés que sur le socle Pro.
    modules: vine.array(vine.enum(PLAN_MODULES)).optional(),
  })
)

export const moduleActionValidator = vine.create(
  vine.object({
    module: vine.enum(PLAN_MODULES),
  })
)

/**
 * Réglage d'un add-on quantitatif (épic #333). `quantity = 0` retire l'add-on ;
 * une valeur positive fixe le nombre d'unités (ex. bateaux supplémentaires).
 */
export const addonActionValidator = vine.create(
  vine.object({
    addon: vine.enum(PLAN_ADDONS),
    quantity: vine.number().withoutDecimals().min(0).max(MAX_ADDON_QUANTITY),
  })
)
