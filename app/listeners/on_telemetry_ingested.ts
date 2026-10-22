import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type TelemetryIngested from '#events/telemetry_ingested'
import InstrumentAlertService from '#services/instrument_alert_service'
import EngineHoursSyncService from '#services/engine_hours_sync_service'
import PositionSyncService from '#services/position_sync_service'

/**
 * Effets métier d'un lot de télémétrie (#991) : heures moteur, position et alertes (#993).
 * Un lot entièrement rejoué (`accepted === 0`) n'a rien de neuf à propager.
 *
 * Une panne de synchronisation est journalisée, jamais propagée : l'ingestion
 * a déjà écrit les échantillons et le client ne doit pas rejouer le lot pour
 * une erreur qui n'est pas la sienne.
 */
@inject()
export default class OnTelemetryIngested {
  constructor(
    private engineHours: EngineHoursSyncService,
    private position: PositionSyncService,
    private alerts: InstrumentAlertService
  ) {}

  async handle(event: TelemetryIngested) {
    if (event.result.accepted === 0) return

    const { source, paths } = event
    await this.run('engine hours', source.boatId, () => this.engineHours.sync(source, paths))
    await this.run('position', source.boatId, () => this.position.sync(source, paths))
    await this.run('alerts', source.boatId, () => this.alerts.evaluate(source, paths))
  }

  private async run(step: string, boatId: number, task: () => Promise<unknown>) {
    try {
      await task()
    } catch (error) {
      logger.error({ err: error, boatId, step }, 'Telemetry sync failed')
    }
  }
}
