import OrganizationInvitationService from '#services/organization_invitation_service'
import PasswordResetService from '#services/password_reset_service'
import UserSessionService from '#services/user_session_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge des jetons morts (#775).
 *
 * Un jeton de réinitialisation expiré et une invitation jamais acceptée n'ont
 * plus aucune utilité, et gardent tous deux l'adresse e-mail de leur
 * destinataire. Rien ne les supprimait : `invalidateTokensForEmail` n'est
 * appelée qu'à la réémission ou à la consommation, et l'expiration d'une
 * invitation n'est qu'une date lue au moment de l'accepter.
 *
 * C'est le cas sans arbitrage produit des deux jobs de rétention : aucune
 * durée à négocier, la donnée est morte par construction.
 */
@inject()
export default class PurgeExpiredTokens extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(
    private passwordResetService: PasswordResetService,
    private invitationService: OrganizationInvitationService,
    private userSessionService: UserSessionService
  ) {
    super()
  }

  async execute() {
    logger.info('PurgeExpiredTokens: starting purge run')

    const passwordResetTokens = await this.passwordResetService.purgeExpired()
    const invitations = await this.invitationService.purgeExpired()
    // Registre des appareils (#885) : lignes inactives au-delà de la rétention.
    const userSessions = await this.userSessionService.purgeStale()

    logger.info(
      { passwordResetTokens, invitations, userSessions },
      'PurgeExpiredTokens: purge complete'
    )
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeExpiredTokens: job failed')
  }
}
