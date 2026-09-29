import BoatEngine from '#models/boat_engine'
import type User from '#models/user'
import BoatListService from '#services/boat_list_service'
import CrewService from '#services/crew_service'
import PlanningService from '#services/planning_service'
import { engineLabelWithStroke } from '#shared/helpers/engine_stroke'
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
 * - le digest planning (tâches en retard / bientôt dues) et les certifications
 *   d'équipage à renouveler (#882).
 */
@inject()
export default class AssistantContextService {
  constructor(
    private boatListService: BoatListService,
    private planningService: PlanningService,
    private crewService: CrewService
  ) {}

  /** Roster complet de l'org — la troncature ne s'applique qu'à l'affichage prompt. */
  async buildFleetRoster(user: User): Promise<AssistantFleetRoster> {
    const boats = await this.boatListService.listNamesForOrg(user)
    const boatIds = boats.map((b) => b.id)

    const engines = boatIds.length
      ? await BoatEngine.query()
          .whereIn('boatId', boatIds)
          .select(['id', 'boatId', 'brand', 'model', 'strokeType', 'family', 'fuel', 'kind'])
          .orderBy('id', 'asc')
      : []

    const enginesByBoat = new Map<number, { id: number; label: string }[]>()
    for (const engine of engines) {
      const baseLabel = [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
      const label = engineLabelWithStroke(baseLabel, engine)
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
    // eslint-disable-next-line no-restricted-syntax -- fragment de prompt destiné au modèle, jamais affiché
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
        // Responsable (#868) : l'assistant peut répondre « qui s'en occupe ».
        const assignee = task.assignee ? ` → ${task.assignee.fullName}` : ''
        lines.push(
          `- ${task.boatName} : ${task.title} (${due})${assignee}`.slice(0, MAX_LINE_LENGTH)
        )
      }
    }

    pushTasks(fr ? 'En retard :' : 'Overdue:', planning.overdueTasks)
    pushTasks(fr ? 'Bientôt dues :' : 'Due soon:', planning.soonTasks)
    // « Qu'est-ce que je dois faire cette semaine ? » (#868) : les tâches
    // confiées à l'utilisateur qui pose la question, les plus proches d'abord.
    pushTasks(
      fr ? "Confiées à l'utilisateur :" : 'Assigned to the user:',
      planning.tasks.filter((task) => task.assignee?.id === user.id)
    )

    // « Qui peut skipper samedi ? » (#882) : les certifications échues ou qui
    // expirent dans les 60 jours, pour qui a accès à la liste d'équipage.
    if (user.organizationId && (await user.hasPermission(user.organizationId, 'crew.create'))) {
      const alerts = await this.crewService.listCertificationAlerts(user.organizationId)
      if (alerts.length > 0) {
        lines.push(
          fr
            ? "Certifications d'équipage expirées ou à renouveler sous 60 jours :"
            : 'Crew certifications expired or expiring within 60 days:'
        )
        for (const alert of alerts.slice(0, ASSISTANT_DIGEST_MAX_TASKS)) {
          const state =
            alert.status === 'expired'
              ? fr
                ? `expirée depuis le ${alert.expiresAt}`
                : `expired since ${alert.expiresAt}`
              : fr
                ? `expire le ${alert.expiresAt}`
                : `expires on ${alert.expiresAt}`
          lines.push(
            `- ${alert.crewMemberName} : ${alert.type} (${state})`.slice(0, MAX_LINE_LENGTH)
          )
        }
      }
    }

    return lines.join('\n')
  }
}
