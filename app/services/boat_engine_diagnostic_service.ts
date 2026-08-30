import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import {
  DiagnosticStepNotFoundError,
  EngineNotDiagnosticEligibleError,
} from '#exceptions/diagnostic_errors'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEngineDiagnosticCheck from '#models/boat_engine_diagnostic_check'
import type User from '#models/user'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import {
  ALL_DIAGNOSTIC_STEP_KEYS,
  GLOBAL_CHECKLIST,
} from '#shared/constants/diagnostic/diagnostic_content'
import { isDiagnosticEligibleEngine } from '#shared/helpers/diagnostic'
import type { EngineDiagnosisInput } from '#shared/types/ai'
import type { DiagnosticEngineRow, DiagnosticResetScope } from '#shared/types/diagnostic'
import { toDiagnosticEngineRow } from '#transformers/diagnostic_transformer'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError, DiagnosticStepNotFoundError, EngineNotDiagnosticEligibleError }

@inject()
export default class BoatEngineDiagnosticService {
  /**
   * Moteurs éligibles au diagnostic (hors-bord 2 temps) de l'organisation du
   * user, avec la progression de la checklist globale.
   */
  async listEligibleEnginesForUser(user: User): Promise<DiagnosticEngineRow[]> {
    if (user.organizationId === null) return []

    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name'])
      .preload('engines', (query) =>
        query.select([
          'id',
          'boatId',
          'brand',
          'model',
          'serialNumber',
          'kind',
          'strokeType',
          'status',
        ])
      )

    const eligible = boats.flatMap((boat) =>
      boat.engines
        .filter((engine) => isDiagnosticEligibleEngine(engine))
        .map((engine) => ({ boat, engine }))
    )
    if (eligible.length === 0) return []

    const checks = await BoatEngineDiagnosticCheck.query()
      .whereIn(
        'boatEngineId',
        eligible.map(({ engine }) => engine.id)
      )
      .where('stepKey', 'like', 'global.%')
      .select(['boatEngineId'])

    const checkedCounts = new Map<number, number>()
    for (const check of checks) {
      checkedCounts.set(check.boatEngineId, (checkedCounts.get(check.boatEngineId) ?? 0) + 1)
    }

    return eligible.map(({ boat, engine }) =>
      toDiagnosticEngineRow(engine, boat, checkedCounts.get(engine.id) ?? 0)
    )
  }

  /** Charge un moteur éligible du bateau, en vérifiant le scoping org. */
  async getEligibleEngineOrFail(user: User, boat: Boat, engineId: number): Promise<BoatEngine> {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()
    if (!isDiagnosticEligibleEngine(engine)) throw new EngineNotDiagnosticEligibleError()

    return engine
  }

  /**
   * Clés cochées d'un moteur déjà chargé et scopé, ou `null` s'il n'est pas
   * éligible au diagnostic — utilisé par la page moteur pour afficher (ou non)
   * l'onglet Diagnostic.
   */
  async getCheckedStepKeysIfEligible(engine: BoatEngine): Promise<string[] | null> {
    if (!isDiagnosticEligibleEngine(engine)) return null

    const checks = await BoatEngineDiagnosticCheck.query()
      .where('boatEngineId', engine.id)
      .select(['stepKey'])

    return checks.map((check) => check.stepKey)
  }

  async getCheckedStepKeys(user: User, boat: Boat, engineId: number): Promise<string[]> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    const checks = await BoatEngineDiagnosticCheck.query()
      .where('boatEngineId', engine.id)
      .select(['stepKey'])

    return checks.map((check) => check.stepKey)
  }

  /**
   * Contexte moteur envoyé au diagnostic IA (#516) : fiche moteur, pièces,
   * historique de maintenance filtré par moteur et progression des checklists.
   * Le moteur est supposé déjà chargé et scopé via `getEligibleEngineOrFail`.
   */
  async getDiagnosisContext(
    engine: BoatEngine
  ): Promise<Pick<EngineDiagnosisInput, 'engine' | 'parts' | 'maintenanceEvents' | 'checklist'>> {
    await engine.load('parts')

    const maintenanceEvents = await BoatMaintenanceEvent.query()
      .where('boatEngineId', engine.id)
      .select(['id', 'title', 'subject', 'performedAt'])
      .orderBy('performedAt', 'desc')
      .limit(5)

    const checks = await BoatEngineDiagnosticCheck.query()
      .where('boatEngineId', engine.id)
      .select(['stepKey'])

    return {
      engine: {
        brand: engine.brand,
        model: engine.model,
        hours: engine.hours,
        strokeType: engine.strokeType,
      },
      parts: engine.parts.map((part) => ({
        designation: part.designation,
        wearState: part.wearState,
      })),
      maintenanceEvents: maintenanceEvents.map((event) => ({
        title: event.title,
        subject: event.subject,
        performedAt: event.performedAt.toISODate()!,
      })),
      checklist: {
        checkedStepKeys: checks.map((check) => check.stepKey),
        totalGlobalSteps: GLOBAL_CHECKLIST.steps.length,
      },
    }
  }

  async toggleStep(
    user: User,
    boat: Boat,
    engineId: number,
    stepKey: string,
    checked: boolean
  ): Promise<void> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    if (!ALL_DIAGNOSTIC_STEP_KEYS.has(stepKey)) throw new DiagnosticStepNotFoundError()

    if (checked) {
      await BoatEngineDiagnosticCheck.firstOrCreate({ boatEngineId: engine.id, stepKey })
    } else {
      await BoatEngineDiagnosticCheck.query()
        .where('boatEngineId', engine.id)
        .where('stepKey', stepKey)
        .delete()
    }
  }

  async resetChecks(
    user: User,
    boat: Boat,
    engineId: number,
    scope: DiagnosticResetScope
  ): Promise<void> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    const query = BoatEngineDiagnosticCheck.query().where('boatEngineId', engine.id)
    if (scope !== 'all') query.where('stepKey', 'like', `${scope}.%`)

    await query.delete()
  }
}
