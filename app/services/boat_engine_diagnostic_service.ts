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
import { ALL_DIAGNOSTIC_STEP_KEYS } from '#shared/constants/diagnostic/diagnostic_content'
import { globalChecklistForEngine, isDiagnosticEligibleEngine } from '#shared/helpers/diagnostic'
import { resolveEngineFamily } from '#shared/helpers/engine_family'
import type { EngineDiagnosisInput } from '#shared/types/ai'
import type { DiagnosticEngineRow, DiagnosticResetScope } from '#shared/types/diagnostic'
import { toDiagnosticEngineRow } from '#transformers/diagnostic_transformer'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError, DiagnosticStepNotFoundError, EngineNotDiagnosticEligibleError }

@inject()
export default class BoatEngineDiagnosticService {
  /**
   * Moteurs éligibles au diagnostic de l'organisation du user, avec la
   * progression de leur checklist globale.
   *
   * L'éligibilité suit la **famille de motorisation** depuis #576 : `family`,
   * `fuel` et `strokeType` sont donc tous chargés — la famille saisie l'emporte,
   * les deux autres servent au repli pour un moteur créé sans famille.
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
          'fuel',
          'strokeType',
          'family',
          'status',
        ])
      )

    const eligible = boats.flatMap((boat) =>
      boat.engines
        .filter((engine) => isDiagnosticEligibleEngine(engine))
        .map((engine) => ({ boat, engine }))
    )
    if (eligible.length === 0) return []

    // Les préfixes de checklist globale diffèrent d'une famille à l'autre
    // (`global.` hors-bord, `global-inboard.` in-bord) : on charge toutes les
    // clés cochées et on compte celles du préfixe propre à chaque moteur, plutôt
    // qu'un `like 'global.%'` qui ne saurait compter qu'une famille.
    const checks = await BoatEngineDiagnosticCheck.query()
      .whereIn(
        'boatEngineId',
        eligible.map(({ engine }) => engine.id)
      )
      .select(['boatEngineId', 'stepKey'])

    const checkedKeys = new Map<number, string[]>()
    for (const check of checks) {
      const keys = checkedKeys.get(check.boatEngineId)
      if (keys) keys.push(check.stepKey)
      else checkedKeys.set(check.boatEngineId, [check.stepKey])
    }

    return eligible.map(({ boat, engine }) => {
      const checklist = globalChecklistForEngine(engine)
      const keys = new Set(checkedKeys.get(engine.id) ?? [])
      const checkedCount = checklist
        ? checklist.steps.filter((step) => keys.has(step.key)).length
        : 0

      return toDiagnosticEngineRow(engine, boat, {
        checkedCount,
        totalSteps: checklist?.steps.length ?? 0,
        family: resolveEngineFamily(engine),
      })
    })
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
        // Le prompt décrit le moteur par sa famille (#576) : un diagnostic
        // diesel qui raisonnerait en 2 temps produirait des conseils faux.
        family: resolveEngineFamily(engine),
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
        totalGlobalSteps: globalChecklistForEngine(engine)?.steps.length ?? 0,
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
