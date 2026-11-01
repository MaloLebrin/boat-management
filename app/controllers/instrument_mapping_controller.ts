import { InstrumentMappingConflictError } from '#exceptions/instrument_errors'
import BoatPolicy from '#policies/boat_policy'
import BoatContextService from '#services/boat_context_service'
import InstrumentMappingApplyService from '#services/instrument_mapping_apply_service'
import { instrumentMappingApplyValidator } from '#validators/boat_instrument_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * « Tout rattacher » de l'assistant (#1037) : crée et relie les propositions
 * cochées en une transaction, puis redirige avec un flash (écran Inertia).
 */
@inject()
export default class InstrumentMappingController {
  constructor(
    private boatContext: BoatContextService,
    private applyService: InstrumentMappingApplyService
  ) {}

  async apply({ auth, response, params, bouncer, request, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params }, 'id')
    if (!loaded) return
    await bouncer.with(BoatPolicy).authorize('edit', loaded.boat)

    const payload = await request.validateUsing(instrumentMappingApplyValidator)

    try {
      const { linked, created } = await this.applyService.apply(loaded.user, loaded.boat, payload)
      session.flash(
        'success',
        i18n.t('flash.instruments.mappingApplied', {
          linked: String(linked),
          created: String(created),
        })
      )
    } catch (error) {
      if (!(error instanceof InstrumentMappingConflictError)) throw error
      session.flash('error', i18n.t('flash.instruments.mappingConflict'))
    }
    return response.redirect().back()
  }
}
