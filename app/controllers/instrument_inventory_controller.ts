import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import InstrumentInventoryService from '#services/instrument_inventory_service'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  InventoryDuplicateDeviceError,
} from '#exceptions/instrument_errors'
import { ingestInventoryApiValidator } from '#validators/instruments'

/**
 * `POST /api/instruments/inventory` (#1036) : le plugin Signal K annonce les
 * appareils du bus, authentifié par le jeton de la source comme l'ingestion.
 * Réponses JSON, jamais de redirection. Le lot n'est jamais journalisé
 * (numéros de série).
 */
@inject()
export default class InstrumentInventoryController {
  constructor(private inventory: InstrumentInventoryService) {}

  async store({ request, response, instrumentSource }: HttpContext) {
    let payload: Awaited<ReturnType<typeof ingestInventoryApiValidator.validate>>
    try {
      payload = await ingestInventoryApiValidator.validate(request.all())
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        return response.status(422).json({ error: 'validation_failed', messages: error.messages })
      }
      throw error
    }

    try {
      const result = await this.inventory.sync(instrumentSource, payload)
      return response.status(201).json(result)
    } catch (error) {
      if (error instanceof InventoryDuplicateDeviceError) {
        return response.status(422).json({ error: 'duplicate_device' })
      }
      if (error instanceof InstrumentSourceDisabledError) {
        return response.status(409).json({ error: 'source_disabled' })
      }
      if (error instanceof InstrumentSourceNotFoundError) {
        return response.status(404).json({ error: 'source_not_found' })
      }
      throw error
    }
  }
}
