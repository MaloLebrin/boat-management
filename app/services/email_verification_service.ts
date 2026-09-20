import EmailVerificationToken from '#models/email_verification_token'
import User from '#models/user'
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '#shared/constants/email_verification'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Flux de vérification d'adresse (#768), calqué sur `PasswordResetService` :
 * jeton en clair envoyé par e-mail, hash SHA-256 stocké, expiration.
 *
 * Il n'existait **aucun** flux de vérification dans le code — l'inscription
 * créait directement un utilisateur, une organisation et une session.
 */
@inject()
export default class EmailVerificationService {
  /**
   * Émet un jeton pour cette adresse et rend sa valeur **en clair** — la
   * seule fois où elle existe. Rend `null` si l'adresse est déjà vérifiée ou
   * inconnue : rien à vérifier dans un cas, rien à révéler dans l'autre.
   *
   * Les jetons précédents de l'adresse sont invalidés : un lien renvoyé rend
   * caduc celui d'avant, comme pour la réinitialisation de mot de passe.
   */
  async createToken(email: string): Promise<string | null> {
    const user = await User.findBy('email', email.toLowerCase())
    if (!user || user.emailVerifiedAt !== null) return null

    await this.invalidateTokensForEmail(user.email)

    // Balayage global des jetons périmés (#768). Un jeton expiré n'a aucune
    // utilité et garde une adresse e-mail ; sans cela la table grossirait sans
    // fin, ce que #775 corrige précisément ailleurs. C'est le moment le moins
    // cher : une inscription ou un renvoi, pas une lecture chaude.
    await this.purgeExpired()

    const token = randomBytes(64).toString('hex')
    await EmailVerificationToken.create({
      email: user.email,
      token: sha256(token),
      expiresAt: DateTime.now().plus({ hours: EMAIL_VERIFICATION_TOKEN_TTL_HOURS }),
    })

    return token
  }

  /** Retrouve le jeton s'il existe et n'est pas expiré. */
  async verifyToken(token: string): Promise<EmailVerificationToken | null> {
    const tokenHash = sha256(token)
    const record = await EmailVerificationToken.findBy('token', tokenHash)
    if (!record) return null

    // Défense en profondeur : comparaison à temps constant du hash stocké et
    // du hash calculé, comme `PasswordResetService.verifyToken`.
    const stored = Buffer.from(record.token, 'hex')
    const computed = Buffer.from(tokenHash, 'hex')
    if (stored.length !== computed.length || !timingSafeEqual(stored, computed)) return null

    if (record.expiresAt < DateTime.now()) return null
    return record
  }

  /**
   * Marque l'adresse vérifiée. Rend `false` si aucun utilisateur ne la porte
   * — un compte supprimé entre l'envoi et le clic.
   *
   * Idempotent : une adresse déjà vérifiée le reste avec sa date d'origine,
   * un double clic sur le lien ne la réécrit pas.
   */
  async markVerified(email: string): Promise<boolean> {
    const user = await User.findBy('email', email.toLowerCase())
    if (!user) return false

    if (user.emailVerifiedAt === null) {
      user.emailVerifiedAt = DateTime.now()
      await user.save()
    }

    return true
  }

  async invalidateTokensForEmail(email: string): Promise<void> {
    await EmailVerificationToken.query().where('email', email.toLowerCase()).delete()
  }

  /** Supprime les jetons expirés. Rend le nombre de lignes supprimées. */
  async purgeExpired(): Promise<number> {
    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await EmailVerificationToken.query()
      .where('expiresAt', '<', DateTime.now().toISO())
      .delete()

    return Number(deleted[0] ?? 0)
  }
}
