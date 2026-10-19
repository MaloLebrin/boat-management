import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import InstrumentSourceService from '#services/instrument_source_service'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'
import { InvalidInstrumentBaseUrlError } from '#exceptions/instrument_errors'
import { upsertInstrumentSourceValidator } from '#validators/instruments'

/**
 * Source Signal K d'un bateau (#988) : enregistrer ou révoquer le serveur et
 * son jeton — admin seulement (`instruments.manage`). Les deux actions
 * redirigent vers la fiche : le formulaire vit dans l'onglet Instruments (PR 3).
 */
@inject()
export default class InstrumentSourcesController {
  constructor(
    private boatContext: BoatContextService,
    private sourceService: InstrumentSourceService,
    private auditLogService: AuditLogService
  ) {}

  async upsert(ctx: HttpContext) {
    const { auth, bouncer, request, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved

    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)
    const payload = await request.validateUsing(upsertInstrumentSourceValidator)

    try {
      const source = await this.sourceService.upsertForBoat(boat, payload)

      await this.auditLogService.log({
        organizationId: boat.organizationId,
        userId: user.id,
        action: 'boat.instrument_source_update',
        entityType: 'boat',
        entityId: boat.id,
        metadata: {
          baseUrl: source.baseUrl,
          enabled: source.enabled,
          hasToken: source.tokenEncrypted !== null,
        },
      })

      session.flash('success', i18n.t('flash.instruments.saved'))
      return response.redirect().back()
    } catch (error) {
      if (error instanceof InvalidInstrumentBaseUrlError) {
        session.flash('error', i18n.t('flash.instruments.invalidBaseUrl'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async destroy(ctx: HttpContext) {
    const { auth, bouncer, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved

    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)

    const removed = await this.sourceService.destroy(boat)
    if (!removed) {
      session.flash('error', i18n.t('flash.instruments.notConfigured'))
      return response.redirect().back()
    }

    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action: 'boat.instrument_source_delete',
      entityType: 'boat',
      entityId: boat.id,
    })

    session.flash('success', i18n.t('flash.instruments.removed'))
    return response.redirect().back()
  }
}
