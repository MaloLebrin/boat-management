import { randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import SimulatorShare from '#models/simulator_share'
import { SIMULATOR_SHARE_LIFETIME_DAYS } from '#shared/constants/data_retention'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

@inject()
export default class SimulatorShareService {
  constructor() {}

  /**
   * Crée un partage, avec son jeton et son échéance.
   *
   * Le jeton passe de `randomBytes(6)` à `randomBytes(16)` (#775). 48 bits ne
   * s'énumèrent pas en pratique et le contenu partagé ne comporte aucune
   * donnée personnelle : ce n'était pas la devinabilité le défaut, mais
   * l'absence d'échéance. On élargit pendant qu'on touche à la table, sans
   * prétendre corriger une faille qui n'existait pas.
   */
  async create(
    input: SimulatorBoatInput,
    breakdown: SimulatorCostBreakdown,
    locale: string
  ): Promise<SimulatorShare> {
    const token = randomBytes(16).toString('hex')
    return SimulatorShare.create({
      token,
      input,
      breakdown,
      locale,
      expiresAt: DateTime.now().plus({ days: SIMULATOR_SHARE_LIFETIME_DAYS }),
    })
  }

  /**
   * Retrouve un partage encore valide.
   *
   * Un partage échu se comporte comme un jeton inconnu : le contrôleur renvoie
   * déjà au simulateur dans ce cas. La date fait foi à la **lecture**, pas
   * seulement à la purge — sinon un lien expiré resterait ouvert jusqu'au
   * passage du cron de minuit.
   *
   * Les anciens jetons de 12 caractères restent lisibles : la recherche est
   * une égalité de chaîne, elle ne dépend pas de la longueur.
   */
  async findByToken(token: string): Promise<SimulatorShare | null> {
    const share = await SimulatorShare.findBy('token', token)
    if (!share) return null
    return share.expiresAt <= DateTime.now() ? null : share
  }

  /** Supprime les partages échus. Rend le nombre de lignes supprimées. */
  async purgeExpired(): Promise<number> {
    const deleted = await SimulatorShare.query()
      .where('expiresAt', '<=', DateTime.now().toISO())
      .delete()

    return Number(deleted[0] ?? 0)
  }
}
