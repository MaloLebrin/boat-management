import type User from '#models/user'
import BoatListService from '#services/boat_list_service'
import PlanningService from '#services/planning_service'
import { ASSISTANT_MAX_STARTERS, type AssistantStarterProps } from '#shared/types/assistant'
import { inject } from '@adonisjs/core'

/**
 * Suggestions de démarrage du copilote (fil vide) : construites côté serveur
 * depuis l'état de la flotte (tâches en retard / bientôt dues) et la page
 * courante, servies dans l'enveloppe de la prop partagée — donc payées
 * uniquement à l'ouverture du panneau, jamais par navigation.
 *
 * Texte 100 % i18n : le serveur ne rend que `{ i18nKey, params }`, le front
 * affiche `t(i18nKey, params)` et envoie le libellé RENDU comme message.
 * Jamais bloquant : toute erreur dégrade sur les suggestions statiques.
 */
@inject()
export default class AssistantStarterService {
  constructor(
    private boatListService: BoatListService,
    private planningService: PlanningService
  ) {}

  async buildStarters(user: User, pagePath: string | null): Promise<AssistantStarterProps[]> {
    const starters: AssistantStarterProps[] = []

    try {
      const planning = await this.planningService.getPlanningForOrg(user)
      if (planning.overdueTasks.length > 0) {
        starters.push({
          id: 'overdue',
          i18nKey: 'assistant.starters.overdue',
          params: { count: String(planning.overdueTasks.length) },
        })
      } else if (planning.soonTasks.length > 0) {
        starters.push({
          id: 'dueSoon',
          i18nKey: 'assistant.starters.dueSoon',
          params: { count: String(planning.soonTasks.length) },
        })
      }
    } catch {
      // Le digest planning est un bonus — jamais bloquant.
    }

    try {
      const pageStarter = await this.#pageStarter(user, pagePath)
      if (pageStarter !== null) starters.push(pageStarter)
    } catch {
      // Idem : une page inconnue ou une erreur de résolution n'empêche rien.
    }

    starters.push({ id: 'fleetSummary', i18nKey: 'assistant.starters.fleetSummary', params: {} })
    starters.push({ id: 'help', i18nKey: 'assistant.starters.help', params: {} })

    return starters.slice(0, ASSISTANT_MAX_STARTERS)
  }

  async #pageStarter(user: User, pagePath: string | null): Promise<AssistantStarterProps | null> {
    if (pagePath === null) return null

    const boatMatch = pagePath.match(/^\/boats\/(\d+)(?:\/|$)/)
    if (boatMatch !== null) {
      const boats = await this.boatListService.listNamesForOrg(user)
      const boat = boats.find((b) => b.id === Number(boatMatch[1]))
      if (boat === undefined) return null
      return {
        id: 'boatPage',
        i18nKey: 'assistant.starters.boatPage',
        params: { boat: boat.name },
      }
    }

    if (pagePath.startsWith('/reservations')) {
      return { id: 'reservations', i18nKey: 'assistant.starters.reservations', params: {} }
    }
    if (pagePath.startsWith('/navigation')) {
      return { id: 'navigation', i18nKey: 'assistant.starters.navigation', params: {} }
    }
    if (pagePath.startsWith('/ports')) {
      return { id: 'ports', i18nKey: 'assistant.starters.ports', params: {} }
    }
    return null
  }
}
