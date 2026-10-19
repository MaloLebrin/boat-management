import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import InstrumentSourceService from '#services/instrument_source_service'
import TelemetryIngestService from '#services/telemetry_ingest_service'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  TelemetryBatchTooLargeError,
  TelemetryPathNotAllowedError,
  TelemetryRecordedAtInvalidError,
  TelemetryValueKindMismatchError,
  TelemetryValueOutOfRangeError,
} from '#exceptions/instrument_errors'
import { ingestTelemetryValidator } from '#validators/instruments'

/**
 * Ingestion de télémétrie par la PWA à bord (#988, D1/D5). Un succès répond
 * **sans flash** : un lot toutes les cinq minutes toasterait sans arrêt. Un
 * refus métier flashe son message ; le `rejectedType` qui range l'action
 * dans `failed` côté file hors-ligne arrive avec l'action `ingest-telemetry`
 * (PR 2, #989) — `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts`
 * refuse un marqueur que le front n'enfile pas encore.
 */
@inject()
export default class BoatTelemetryController {
  constructor(
    private boatContext: BoatContextService,
    private sourceService: InstrumentSourceService,
    private ingestService: TelemetryIngestService
  ) {}

  async store(ctx: HttpContext) {
    const { auth, bouncer, request, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { boat } = resolved

    await bouncer.with(InstrumentSourcePolicy).authorize('ingest', boat)
    const payload = await request.validateUsing(ingestTelemetryValidator)

    try {
      const source = await this.sourceService.findForBoat(boat)
      if (!source) throw new InstrumentSourceNotFoundError()
      await this.ingestService.ingest(source, payload, { origin: 'pwa' })
      return response.redirect().back()
    } catch (error) {
      const key = rejectionFlashKey(error)
      if (key === null) throw error
      session.flash('error', i18n.t(key))
      return response.redirect().back()
    }
  }
}

function rejectionFlashKey(error: unknown): string | null {
  if (error instanceof InstrumentSourceNotFoundError) return 'flash.instruments.notConfigured'
  if (error instanceof InstrumentSourceDisabledError) return 'flash.instruments.disabled'
  if (error instanceof TelemetryBatchTooLargeError) return 'flash.instruments.batchTooLarge'
  if (error instanceof TelemetryPathNotAllowedError) return 'flash.instruments.pathNotAllowed'
  if (error instanceof TelemetryRecordedAtInvalidError) return 'flash.instruments.recordedAtInvalid'
  if (error instanceof TelemetryValueOutOfRangeError) return 'flash.instruments.valueInvalid'
  if (error instanceof TelemetryValueKindMismatchError) return 'flash.instruments.valueInvalid'
  return null
}
