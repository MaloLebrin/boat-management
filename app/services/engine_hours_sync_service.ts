import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import BoatEngine from '#models/boat_engine'
import BoatEngineService from '#services/boat_engine_service'
import TelemetryReadService from '#services/telemetry_read_service'
import { decideRunTimeSync, engineRunTimePath } from '#shared/helpers/instruments'
import type { EngineHoursSyncOutcome } from '#shared/types/instruments'

/**
 * Heures moteur lues sur le calculateur (#991, D6). Le `runTime` Signal K est
 * un compteur **absolu** en secondes ; `hours` est saisi à l'installation et
 * enrichi aux clôtures de trajet. On ne copie donc jamais l'un dans l'autre :
 * on mémorise une base (`instrument_run_time_s`) et on n'ajoute à `hours` que
 * les heures entières écoulées depuis. Rejouer le même lot ne change rien.
 */
@inject()
export default class EngineHoursSyncService {
  constructor(
    private readService: TelemetryReadService,
    private engineService: BoatEngineService
  ) {}

  async sync(
    source: Pick<BoatInstrumentSource, 'boatId'>,
    paths: readonly string[]
  ): Promise<EngineHoursSyncOutcome[]> {
    const engines = await BoatEngine.query()
      .where('boatId', source.boatId)
      .whereNotNull('instrumentKey')
    const concerned = engines.filter(
      (engine) => engine.instrumentKey && paths.includes(engineRunTimePath(engine.instrumentKey))
    )
    if (concerned.length === 0) return []

    const latest = await this.readService.latestForPaths(
      { id: source.boatId },
      concerned.map((engine) => engineRunTimePath(engine.instrumentKey!))
    )

    const outcomes: EngineHoursSyncOutcome[] = []
    for (const engine of concerned) {
      const runTime = latest.get(engineRunTimePath(engine.instrumentKey!))?.value
      if (typeof runTime !== 'number' || !Number.isFinite(runTime) || runTime < 0) continue
      outcomes.push(await this.applyRunTime(engine.id, runTime))
    }
    return outcomes
  }

  /** Verrou de ligne : deux lots simultanés ne comptent pas deux fois la même heure. */
  private async applyRunTime(engineId: number, runTimeS: number): Promise<EngineHoursSyncOutcome> {
    return await db.transaction(async (trx) => {
      const engine = await BoatEngine.query({ client: trx })
        .where('id', engineId)
        .forUpdate()
        .firstOrFail()
      const decision = decideRunTimeSync(runTimeS, engine.instrumentRunTimeS)

      if (decision.action === 'init' || decision.action === 'rebase') {
        if (decision.action === 'rebase') {
          logger.warn(
            { engineId, previousBaseS: engine.instrumentRunTimeS, runTimeS },
            'Engine runTime went backwards, rebasing instrument hours'
          )
        }
        engine.useTransaction(trx)
        engine.instrumentRunTimeS = decision.baseS
        await engine.save()
        return { engineId, action: decision.action, hoursAdded: 0 }
      }

      if (decision.action === 'increment') {
        await this.engineService.incrementHoursFromInstruments(engine, decision.hours, trx)
        return { engineId, action: 'increment' as const, hoursAdded: decision.hours }
      }

      return { engineId, action: 'none' as const, hoursAdded: 0 }
    })
  }
}
