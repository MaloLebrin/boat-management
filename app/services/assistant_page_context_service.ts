import BoatEngine from '#models/boat_engine'
import Client from '#models/client'
import type User from '#models/user'
import BoatListService from '#services/boat_list_service'
import type { AiSuggestionLocale } from '#shared/types/ai'
import { ASSISTANT_NAV_TARGETS } from '#shared/types/assistant'
import { inject } from '@adonisjs/core'

/**
 * Contexte de page du copilote FleetAi : le panneau envoie l'URL de la page
 * depuis laquelle l'utilisateur écrit, résolue ici en UNE ligne de prompt
 * (« Page courante : … ») — jamais stockée, reconstruite à chaque tour.
 *
 * Résolution : pages nommées via `ASSISTANT_NAV_TARGETS` inversé, pages
 * d'entité (`/boats/:id`, `/boats/:boatId/engines/:engineId`, `/clients/:id`)
 * via des requêtes bornées à l'organisation. JAMAIS bloquant : URL inconnue,
 * id hors org ou erreur quelconque → `null`, le prompt n'a simplement pas de
 * section page.
 */
@inject()
export default class AssistantPageContextService {
  constructor(private boatListService: BoatListService) {}

  async resolvePageLine(
    user: User,
    pageUrl: string | null,
    locale: AiSuggestionLocale
  ): Promise<string | null> {
    if (pageUrl === null || pageUrl.trim() === '') return null

    try {
      const path = normalizePath(pageUrl)
      if (path === null) return null

      const staticTarget = Object.values(ASSISTANT_NAV_TARGETS).find((t) => t.path === path)
      if (staticTarget !== undefined) return staticTarget.promptLabel[locale]

      const engineMatch = path.match(/^\/boats\/(\d+)\/engines\/(\d+)(?:\/|$)/)
      if (engineMatch !== null) {
        return this.#engineLine(user, Number(engineMatch[1]), Number(engineMatch[2]), locale)
      }

      const boatMatch = path.match(/^\/boats\/(\d+)(?:\/|$)/)
      if (boatMatch !== null) {
        return this.#boatLine(user, Number(boatMatch[1]), locale)
      }

      const clientMatch = path.match(/^\/clients\/(\d+)$/)
      if (clientMatch !== null) {
        return this.#clientLine(user, Number(clientMatch[1]), locale)
      }

      return null
    } catch {
      return null
    }
  }

  async #boatLine(user: User, boatId: number, locale: AiSuggestionLocale): Promise<string | null> {
    const boats = await this.boatListService.listNamesForOrg(user)
    const boat = boats.find((b) => b.id === boatId)
    if (boat === undefined) return null
    return locale === 'fr'
      ? `Fiche du bateau ${boat.name} (#${boat.id})`
      : `Boat page for ${boat.name} (#${boat.id})`
  }

  async #engineLine(
    user: User,
    boatId: number,
    engineId: number,
    locale: AiSuggestionLocale
  ): Promise<string | null> {
    const boats = await this.boatListService.listNamesForOrg(user)
    const boat = boats.find((b) => b.id === boatId)
    if (boat === undefined) return null

    const engine = await BoatEngine.query()
      .select(['id', 'brand', 'model'])
      .where('id', engineId)
      .where('boatId', boat.id)
      .first()
    if (engine === null) return null

    const label = [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
    return locale === 'fr'
      ? `Moteur ${label} (#${engine.id}) du bateau ${boat.name} (#${boat.id})`
      : `Engine ${label} (#${engine.id}) of boat ${boat.name} (#${boat.id})`
  }

  async #clientLine(
    user: User,
    clientId: number,
    locale: AiSuggestionLocale
  ): Promise<string | null> {
    if (user.organizationId === null) return null
    const client = await Client.query()
      .select(['id', 'first_name', 'last_name'])
      .where('id', clientId)
      .where('organizationId', user.organizationId)
      .first()
    if (client === null) return null
    return locale === 'fr'
      ? `Fiche du client ${client.fullName} (#${client.id})`
      : `Client page for ${client.fullName} (#${client.id})`
  }
}

/** Chemin sans origine, query, hash ni slash final — `null` si inexploitable. */
export function normalizePath(pageUrl: string): string | null {
  let path = pageUrl.trim()
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname
    } catch {
      return null
    }
  }
  const cut = path.split(/[?#]/)[0]
  if (!cut.startsWith('/')) return null
  const trimmed = cut.length > 1 ? cut.replace(/\/+$/, '') : cut
  return trimmed === '' ? '/' : trimmed
}
