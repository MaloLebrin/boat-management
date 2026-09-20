import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { EXPIRED_TOKEN_GRACE_DAYS } from '#shared/constants/data_retention'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

@inject()
export default class PasswordResetService {
  async createToken(email: string): Promise<string | null> {
    const user = await User.findBy('email', email)
    if (!user) return null

    await PasswordResetToken.query().where('email', email).delete()

    const token = randomBytes(64).toString('hex')
    await PasswordResetToken.create({
      email,
      token: sha256(token),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    return token
  }

  async verifyToken(token: string): Promise<PasswordResetToken | null> {
    const tokenHash = sha256(token)
    const record = await PasswordResetToken.findBy('token', tokenHash)
    if (!record) return null

    // Defense-in-depth: constant-time comparison of stored vs computed hash
    const stored = Buffer.from(record.token, 'hex')
    const computed = Buffer.from(tokenHash, 'hex')
    if (stored.length !== computed.length || !timingSafeEqual(stored, computed)) return null

    if (record.expiresAt < DateTime.now()) return null
    return record
  }

  /**
   * Coupe tous les accès existants d'un utilisateur (#763).
   *
   * Changer son mot de passe est le seul geste de remédiation qu'on propose à
   * quelqu'un qui pense son compte compromis, et c'est celui que la page
   * « mot de passe oublié » met en avant. Il ne révoquait rien : l'attaquant
   * déjà connecté le restait.
   *
   * Deux accès survivaient au changement :
   *
   * 1. **les sessions ouvertes** (`age: '5d'`, `clearWithBrowser: false`) —
   *    coupées ici en datant `sessionsValidAfter`, que
   *    `RevokedSessionMiddleware` compare à chaque requête. Avec
   *    `SESSION_DRIVER=cookie` il n'existe pas de table de sessions à vider :
   *    le discriminant doit être porté par l'utilisateur ;
   * 2. **les remember-me tokens** (`rememberMeTokensAge: '30d'`) — supprimés
   *    par l'API du provider, pas par un `DELETE` brut. C'était le pire des
   *    deux : le cookie suffit à se réauthentifier, le mot de passe ne sert
   *    plus à rien, et il vit trente jours.
   *
   * `validAfter` est rendu pour que l'appelant puisse **réestampiller la
   * session courante** — le changement depuis les réglages ne doit pas
   * déconnecter celui qui vient d'agir.
   */
  async revokeAllAccess(user: User): Promise<DateTime> {
    const tokens = await User.rememberMeTokens.all(user)
    for (const token of tokens) {
      await User.rememberMeTokens.delete(user, token.identifier)
    }

    const validAfter = DateTime.now()
    user.sessionsValidAfter = validAfter
    await user.save()

    return validAfter
  }

  /** Variante par e-mail, pour le flux « mot de passe oublié ». */
  async revokeAllAccessForEmail(email: string): Promise<DateTime | null> {
    const user = await User.findBy('email', email)
    if (!user) return null
    return this.revokeAllAccess(user)
  }

  async invalidateTokensForEmail(email: string): Promise<void> {
    await PasswordResetToken.query().where('email', email).delete()
  }

  /**
   * Supprime les jetons expirés depuis assez longtemps (#775).
   *
   * `invalidateTokensForEmail` n'est appelée qu'à la réémission ou à la
   * consommation : une demande de réinitialisation jamais suivie laissait sa
   * ligne — et l'adresse e-mail qu'elle porte — en base pour toujours. Un
   * jeton expiré n'a aucune utilité ; le délai de grâce ne sert qu'à pouvoir
   * regarder la ligne quand un utilisateur dit « mon lien ne marche pas ».
   *
   * Rend le nombre de lignes supprimées.
   */
  async purgeExpired(graceDays = EXPIRED_TOKEN_GRACE_DAYS): Promise<number> {
    const cutoff = DateTime.now().minus({ days: graceDays })

    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await PasswordResetToken.query()
      .where('expiresAt', '<', cutoff.toISO())
      .delete()

    return Number(deleted[0] ?? 0)
  }

  /**
   * Updates the password for a user by email.
   * Returns true if user was found and password updated, false otherwise.
   *
   * ⚠️ Le mot de passe est assigné **en clair** : le hachage appartient au
   * modèle. `User` compose `withAuthFinder(() => hash.use())`, dont le hook
   * `beforeSave` hache `password` dès qu'il est modifié. Pré-hacher ici le
   * faisait hacher deux fois, et le hash stocké ne correspondait alors à aucune
   * saisie possible : après une réinitialisation, ni l'ancien ni le nouveau mot
   * de passe ne fonctionnaient, et redemander un lien reproduisait le même
   * effet (#691).
   */
  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const user = await User.findBy('email', email)
    if (!user) return false

    user.password = newPassword
    await user.save()
    return true
  }
}
