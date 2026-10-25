import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'
import { InstrumentSourceNotFoundError } from '#exceptions/instrument_errors'

/**
 * Jeton d'ingestion du plugin Signal K (#994) — admin seulement
 * (`instruments.manage`). La génération flashe le jeton en clair, lu **une
 * fois** par l'onglet Instruments (prop partagée `flash.instrumentIngestToken`) ;
 * ensuite seul son hash existe.
 */
@inject()
export default class InstrumentIngestTokensController {
  constructor(
    private boatContext: BoatContextService,
    private tokenService: InstrumentIngestTokenService,
    private auditLogService: AuditLogService
  ) {}

  async store(ctx: HttpContext) {
    const { auth, bouncer, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved
    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)

    try {
      const token = await this.tokenService.issueForBoat(boat)
      await this.auditLogService.log({
        organizationId: boat.organizationId,
        userId: user.id,
        action: 'boat.instrument_ingest_token_issue',
        entityType: 'boat',
        entityId: boat.id,
      })
      session.flash('success', i18n.t('flash.instruments.ingestTokenIssued'))
      session.flash('instrumentIngestToken', token)
    } catch (error) {
      if (!(error instanceof InstrumentSourceNotFoundError)) throw error
      session.flash('error', i18n.t('flash.instruments.notConfigured'))
    }
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { auth, bouncer, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved
    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)

    const revoked = await this.tokenService.revokeForBoat(boat)
    if (revoked) {
      await this.auditLogService.log({
        organizationId: boat.organizationId,
        userId: user.id,
        action: 'boat.instrument_ingest_token_revoke',
        entityType: 'boat',
        entityId: boat.id,
      })
      session.flash('success', i18n.t('flash.instruments.ingestTokenRevoked'))
    } else {
      session.flash('error', i18n.t('flash.instruments.ingestTokenNone'))
    }
    return response.redirect().back()
  }
}
