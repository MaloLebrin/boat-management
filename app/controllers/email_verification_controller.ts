import EmailVerificationService from '#services/email_verification_service'
import EmailQueueService from '#services/email_queue_service'
import env from '#start/env'
import { EMAIL_VERIFICATION_PATH } from '#shared/constants/email_verification'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Flux de vérification d'adresse (#768).
 *
 * Trois écrans : le rappel (`GET /verify-email`), le renvoi du lien
 * (`POST /verify-email/resend`, throttlé) et la consommation du lien
 * (`GET /verify-email/confirm`).
 *
 * La confirmation est **publique** : le lien arrive par e-mail et rien ne dit
 * que la session est encore ouverte dans le navigateur qui l'ouvre. Exiger
 * d'être connecté renverrait sur `/login` en perdant le jeton — exactement le
 * piège de #770. Le jeton prouve à lui seul la possession de l'adresse.
 */
@inject()
export default class EmailVerificationController {
  constructor(
    private emailVerificationService: EmailVerificationService,
    private emailQueueService: EmailQueueService
  ) {}

  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()

    return inertia.render('auth/verify_email', {
      email: user.email,
      isVerified: user.emailVerifiedAt !== null,
    })
  }

  async resend({ response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    const token = await this.emailVerificationService.createToken(user.email)
    if (token !== null) {
      await this.emailQueueService.sendEmailVerification({
        to: user.email,
        verificationUrl: this.#verificationUrl(token),
      })
    }

    // Message identique qu'un lien soit parti ou non : une adresse déjà
    // vérifiée n'a pas à se distinguer d'une adresse en attente.
    session.flash('success', i18n.t('flash.auth.emailVerificationSent'))
    return response.redirect().toPath(EMAIL_VERIFICATION_PATH)
  }

  async confirm({ request, response, session, i18n }: HttpContext) {
    const token = request.qs().token

    const record =
      typeof token === 'string' && token.length > 0
        ? await this.emailVerificationService.verifyToken(token)
        : null

    if (record === null) {
      return this.#backToLogin(response, session, i18n, 'error', 'emailVerificationTokenInvalid')
    }

    const marked = await this.emailVerificationService.markVerified(record.email)
    if (!marked) {
      return this.#backToLogin(response, session, i18n, 'error', 'emailVerificationTokenInvalid')
    }

    // Un jeton ne sert qu'une fois : le suivant repartira d'un renvoi.
    await this.emailVerificationService.invalidateTokensForEmail(record.email)

    return this.#backToLogin(response, session, i18n, 'success', 'emailVerified')
  }

  /**
   * Redirection vers `/login` **sans la query string entrante**.
   *
   * `redirect().toPath()` reporte par défaut les paramètres de la requête :
   * le jeton de vérification se serait retrouvé dans `/login?token=…`, donc
   * dans l'historique du navigateur et dans le `Referer` envoyé aux ressources
   * de la page de connexion. C'est exactement la fuite corrigée en #770 pour
   * le jeton de réinitialisation — `withQs(false)` la coupe.
   */
  #backToLogin(
    response: HttpContext['response'],
    session: HttpContext['session'],
    i18n: HttpContext['i18n'],
    kind: 'error' | 'success',
    key: string
  ) {
    session.flash(kind, i18n.t(`flash.auth.${key}`))
    return response.redirect().withQs(false).toPath('/login')
  }

  #verificationUrl(token: string): string {
    return `${env.get('APP_URL')}/verify-email/confirm?token=${token}`
  }
}
