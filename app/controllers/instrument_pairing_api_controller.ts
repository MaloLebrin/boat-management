import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import InstrumentPairingService from '#services/instrument_pairing_service'
import {
  createInstrumentPairingValidator,
  pollInstrumentPairingValidator,
} from '#validators/instruments'

/**
 * API d'appairage du plugin Signal K (#1032) — JSON, sans session ni CSRF.
 *
 * - `POST /api/instruments/pairing` : crée l'appairage, rend `deviceCode` et
 *   `userCode` (seule fois où ils existent en clair) ;
 * - `POST /api/instruments/pairing/poll` : `pending` | `expired` | `approved`
 *   (+ jeton `fai_ing_…`, une seule fois).
 *
 * Ces deux contrôleurs ne journalisent jamais le corps des requêtes.
 */
@inject()
export default class InstrumentPairingApiController {
  constructor(private pairingService: InstrumentPairingService) {}

  async store({ request, response }: HttpContext) {
    let payload: Awaited<ReturnType<typeof createInstrumentPairingValidator.validate>>
    try {
      payload = await createInstrumentPairingValidator.validate(request.all())
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        return response.status(422).json({ error: 'validation_failed', messages: error.messages })
      }
      throw error
    }

    const created = await this.pairingService.create(payload)
    return response.status(201).header('Cache-Control', 'no-store').json(created)
  }

  async poll({ request, response }: HttpContext) {
    let payload: Awaited<ReturnType<typeof pollInstrumentPairingValidator.validate>>
    try {
      payload = await pollInstrumentPairingValidator.validate(request.all())
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        return response.status(422).json({ error: 'validation_failed', messages: error.messages })
      }
      throw error
    }

    const result = await this.pairingService.poll(payload.deviceCode)
    return response.status(200).header('Cache-Control', 'no-store').json(result)
  }
}
