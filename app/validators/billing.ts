import { PLAN_MODULES } from '#shared/types/plan'
import vine from '@vinejs/vine'

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
