import type BoatInstrumentSource from '#models/boat_instrument_source'
import type { TelemetryIngestOrigin, TelemetryIngestResult } from '#shared/types/instruments'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Un lot de télémétrie vient d'être écrit (#988, D1). Les effets métier —
 * heures moteur et position (PR 4), alertes (PR 6) — sont des listeners de
 * cet event, jamais du contrôleur : le contrôleur Inertia et le contrôleur
 * `/api` du plugin (PR 7) l'émettent tous deux.
 */
export default class TelemetryIngested extends BaseEvent {
  constructor(
    public readonly source: BoatInstrumentSource,
    public readonly result: TelemetryIngestResult,
    /** Chemins distincts du lot accepté, pour que chaque listener filtre vite. */
    public readonly paths: readonly string[],
    public readonly origin: TelemetryIngestOrigin,
    public readonly batchId: string
  ) {
    super()
  }
}
