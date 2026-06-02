import { Bouncer } from '@adonisjs/bouncer'

// Abilities migrated to policies — see app/policies/
// Kept as empty export to preserve the #abilities/main import used in initialize_bouncer_middleware.ts

export const placeholder = Bouncer.ability(() => false)
