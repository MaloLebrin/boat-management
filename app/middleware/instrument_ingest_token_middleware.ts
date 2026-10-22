import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import Organization from '#models/organization'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import QuotaService from '#services/quota_service'

/**
 * Authentifie le plugin Signal K (#994) : `Authorization: Bearer <jeton>` →
 * sha256 → source. La requête ne porte ni session ni utilisateur ; `ctx.
 * instrumentSource` est ce que lit le contrôleur. Réponses JSON : cette route
 * est sous `/api/`, jamais appelée depuis une page Inertia.
 *
 * - 401 : jeton absent, inconnu ou révoqué (même réponse, on ne dit pas lequel) ;
 * - 403 : le plan de l'organisation n'ouvre plus les instruments (rétrogradation).
 */
@inject()
export default class InstrumentIngestTokenMiddleware {
  constructor(
    private tokens: InstrumentIngestTokenService,
    private quota: QuotaService
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const source = await this.tokens.findSourceByBearer(ctx.request.header('authorization'))
    if (!source) {
      return ctx.response
        .status(401)
        .header('WWW-Authenticate', 'Bearer realm="instruments"')
        .json({ error: 'unauthorized' })
    }

    const organization = await Organization.find(source.organizationId)
    if (!organization || !this.quota.canConnectInstruments(organization)) {
      return ctx.response.status(403).json({ error: 'plan_not_allowed' })
    }

    ctx.instrumentSource = source
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    /** Source authentifiée par le jeton du plugin (`InstrumentIngestTokenMiddleware`). */
    instrumentSource: BoatInstrumentSource
  }
}
