import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import InstrumentPairingService from '#services/instrument_pairing_service'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'
import {
  InstrumentPairingAlreadyUsedError,
  InstrumentPairingCodeInvalidError,
  InstrumentPairingRateLimitedError,
} from '#exceptions/instrument_pairing_errors'
import { attachInstrumentPairingValidator } from '#validators/instruments'

/**
 * Rattachement d'un boîtier par son code (#1032) — admin seulement
 * (`instruments.manage`), plans Pro et Entreprise (groupe de routes). Le jeton
 * n'est pas généré ici mais au prochain `poll` du boîtier : il ne transite
 * jamais par le navigateur.
 */
@inject()
export default class InstrumentPairingsController {
  constructor(
    private boatContext: BoatContextService,
    private pairingService: InstrumentPairingService,
    private auditLogService: AuditLogService
  ) {}

  async store(ctx: HttpContext) {
    const { auth, bouncer, request, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved
    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)
    const { userCode } = await request.validateUsing(attachInstrumentPairingValidator)

    try {
      const pairing = await this.pairingService.attach(boat, user, userCode)
      await this.auditLogService.log({
        organizationId: boat.organizationId,
        userId: user.id,
        action: 'boat.instrument_pairing_attach',
        entityType: 'boat',
        entityId: boat.id,
        metadata: {
          pairingId: pairing.id,
          deviceLabel: pairing.deviceLabel,
          hardwareKind: pairing.hardwareKind,
          pluginVersion: pairing.pluginVersion,
        },
      })
      session.flash(
        'success',
        i18n.t('flash.instruments.pairingAttached', {
          device: pairing.deviceLabel ?? i18n.t('flash.instruments.pairingDeviceDefault'),
        })
      )
    } catch (error) {
      if (error instanceof InstrumentPairingCodeInvalidError) {
        session.flash('error', i18n.t('flash.instruments.pairingCodeInvalid'))
      } else if (error instanceof InstrumentPairingAlreadyUsedError) {
        session.flash('error', i18n.t('flash.instruments.pairingAlreadyUsed'))
      } else if (error instanceof InstrumentPairingRateLimitedError) {
        session.flash(
          'error',
          i18n.t('flash.instruments.pairingRateLimited', {
            minutes: String(Math.max(1, Math.ceil(error.retryAfterSeconds / 60))),
          })
        )
      } else {
        throw error
      }
    }
    return response.redirect().back()
  }
}
