import BoatEngine from '#models/boat_engine'
import type User from '#models/user'
import BoatListService from '#services/boat_list_service'
import PlanningService from '#services/planning_service'
import {
  ASSISTANT_DIGEST_MAX_TASKS,
  ASSISTANT_ROSTER_MAX_BOATS,
  type AssistantFleetRoster,
} from '#shared/types/assistant'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type { PlanningTask } from '#shared/types/planning'
import { inject } from '@adonisjs/core'

/** Longueur max d'une ligne injectée dans le prompt (budget de tokens). */
const MAX_LINE_LENGTH = 120

/**
 * Contexte flotte injecté dans le prompt système du copilote FleetAi.
 *
 * Reconstruit à chaque tour (jamais stocké) : les réponses restent fraîches.
 * Deux blocs, tous deux bornés pour tenir le budget de tokens :
 * - le roster (bateaux + moteurs avec leurs ids) — il sert aussi de référentiel
 *   de validation des ids rendus par le modèle (anti-hallucination) ;
 * - le digest planning (tâches en retard / bientôt dues).
 */
@inject()
export default class AssistantContextService {
  constructor(
    private boatListService: BoatListService,
    private planningService: PlanningService
  ) {}

  /** Roster complet de l'org — la troncature ne s'applique qu'à l'affichage prompt. */
  async buildFleetRoster(user: User): Promise<AssistantFleetRoster> {
    const boats = await this.boatListService.listNamesForOrg(user)
    const boatIds = boats.map((b) => b.id)

    const engines = boatIds.length
      ? await BoatEngine.query()
          .whereIn('boatId', boatIds)
          .select(['id', 'boatId', 'brand', 'model'])
          .orderBy('id', 'asc')
      : []

    const enginesByBoat = new Map<number, { id: number; label: string }[]>()
    for (const engine of engines) {
      const label = [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
      const list = enginesByBoat.get(engine.boatId) ?? []
      list.push({ id: engine.id, label })
      enginesByBoat.set(engine.boatId, list)
    }

    return {
      boats: boats.map((boat) => ({
        id: boat.id,
        name: boat.name,
        engines: enginesByBoat.get(boat.id) ?? [],
      })),
      truncated: boats.length > ASSISTANT_ROSTER_MAX_BOATS,
    }
  }

  /** Lignes du roster pour le prompt — bornées à `ASSISTANT_ROSTER_MAX_BOATS`. */
  rosterLines(roster: AssistantFleetRoster): string {
    return roster.boats
      .slice(0, ASSISTANT_ROSTER_MAX_BOATS)
      .map((boat) => {
        const engines = boat.engines.map((e) => `#${e.id} ${e.label}`).join(', ')
        const line = engines
          ? `- #${boat.id} ${boat.name} | moteurs: ${engines}`
          : `- #${boat.id} ${boat.name}`
        return line.slice(0, MAX_LINE_LENGTH)
      })
      .join('\n')
  }

  /** Digest planning : compteurs + top N en retard + top N bientôt dues. */
  async buildFleetDigestLines(user: User, locale: AiSuggestionLocale): Promise<string> {
    const planning = await this.planningService.getPlanningForOrg(user)
    const fr = locale === 'fr'

    const lines: string[] = [
      fr
        ? `Tâches ouvertes : ${planning.tasks.length} (en retard : ${planning.overdueTasks.length}, bientôt dues : ${planning.soonTasks.length})`
        : `Open tasks: ${planning.tasks.length} (overdue: ${planning.overdueTasks.length}, due soon: ${planning.soonTasks.length})`,
    ]

    const pushTasks = (header: string, tasks: PlanningTask[]) => {
      if (tasks.length === 0) return
      lines.push(header)
      for (const task of tasks.slice(0, ASSISTANT_DIGEST_MAX_TASKS)) {
        const due =
          task.kind === 'hours'
            ? `${task.dueEngineHours ?? '?'} h`
            : (task.dueAt ?? (fr ? 'sans date' : 'no date'))
        lines.push(`- ${task.boatName} : ${task.title} (${due})`.slice(0, MAX_LINE_LENGTH))
      }
    }

    pushTasks(fr ? 'En retard :' : 'Overdue:', planning.overdueTasks)
    pushTasks(fr ? 'Bientôt dues :' : 'Due soon:', planning.soonTasks)

    return lines.join('\n')
  }
}
