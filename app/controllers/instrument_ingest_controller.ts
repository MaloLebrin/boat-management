import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import TelemetryIngestService from '#services/telemetry_ingest_service'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  TelemetryBatchTooLargeError,
  TelemetryPathNotAllowedError,
  TelemetryRecordedAtInvalidError,
  TelemetryValueKindMismatchError,
  TelemetryValueOutOfRangeError,
} from '#exceptions/instrument_errors'
import { ingestTelemetryApiValidator } from '#validators/instruments'

/**
 * `POST /api/instruments/ingest` (#994) : le plugin Signal K pousse un lot
 * authentifié par le jeton de la source (`InstrumentIngestTokenMiddleware`).
 * Même `TelemetryIngestService.ingest` que la PWA (D1), origine `plugin`.
 * Réponses JSON, jamais de redirection : le client n'est pas un navigateur.
 *
 * Un rejeu est un succès (`ignored` le compte) ; un refus métier porte un
 * `error` stable que le plugin peut tester.
 */
@inject()
export default class InstrumentIngestController {
  constructor(private ingestService: TelemetryIngestService) {}

  async store({ request, response, instrumentSource }: HttpContext) {
    let payload: Awaited<ReturnType<typeof ingestTelemetryApiValidator.validate>>
    try {
      payload = await ingestTelemetryApiValidator.validate(request.all())
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        return response.status(422).json({ error: 'validation_failed', messages: error.messages })
      }
      throw error
    }

    if (payload.sourceId !== undefined && payload.sourceId !== instrumentSource.id) {
      return response.status(422).json({ error: 'source_mismatch' })
    }

    try {
      const result = await this.ingestService.ingest(
        instrumentSource,
        { ...payload, sourceId: instrumentSource.id },
        { origin: 'plugin' }
      )
      return response.status(200).json(result)
    } catch (error) {
      const rejection = rejectionOf(error)
      if (rejection === null) throw error
      return response.status(rejection.status).json(rejection.body)
    }
  }
}

function rejectionOf(error: unknown): { status: number; body: Record<string, unknown> } | null {
  if (error instanceof InstrumentSourceDisabledError) {
    return { status: 409, body: { error: 'source_disabled' } }
  }
  if (error instanceof InstrumentSourceNotFoundError) {
    return { status: 404, body: { error: 'source_not_found' } }
  }
  if (error instanceof TelemetryBatchTooLargeError) {
    return { status: 413, body: { error: 'batch_too_large', max: error.max } }
  }
  if (error instanceof TelemetryPathNotAllowedError) {
    return { status: 422, body: { error: 'path_not_allowed', path: error.path } }
  }
  if (error instanceof TelemetryRecordedAtInvalidError) {
    return { status: 422, body: { error: 'recorded_at_invalid' } }
  }
  if (
    error instanceof TelemetryValueOutOfRangeError ||
    error instanceof TelemetryValueKindMismatchError
  ) {
    return { status: 422, body: { error: 'value_invalid' } }
  }
  return null
}
