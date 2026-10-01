import User from '#models/user'
import SessionLoginService from '#services/session_login_service'
import TwoFactorService from '#services/two_factor_service'
import { InvalidTwoFactorCodeError } from '#exceptions/two_factor_errors'
import { twoFactorAccountKey, twoFactorAccountLimiter } from '#start/limiter'
import { twoFactorCodeValidator } from '#validators/two_factor'
import { clearTwoFactorChallenge, readTwoFactorChallenge } from '#utils/two_factor_challenge'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Second facteur à la connexion (#884) : `/login/2fa`, entre le mot de passe
 * (`SessionController.store`) et l'ouverture de la session.
 */
@inject()
export default class TwoFactorChallengeController {
  constructor(
    private twoFactorService: TwoFactorService,
    private sessionLoginService: SessionLoginService
  ) {}

  async create({ inertia, session, response, i18n }: HttpContext) {
    if (!readTwoFactorChallenge(session)) {
      session.flash('error', i18n.t('flash.twoFactor.challengeExpired'))
      return response.redirect().toPath('/login')
    }
    return inertia.render('auth/two_factor_challenge', {})
  }

  async store({ request, response, session, auth, i18n }: HttpContext) {
    const pending = readTwoFactorChallenge(session)
    if (!pending) {
      session.flash('error', i18n.t('flash.twoFactor.challengeExpired'))
      return response.redirect().toPath('/login')
    }

    const { code } = await request.validateUsing(twoFactorCodeValidator)
    const user = await User.find(pending.userId)
    if (!user?.hasTwoFactorEnabled) {
      // Compte supprimé ou 2FA désactivée entre-temps : on repart du mot de passe.
      clearTwoFactorChallenge(session)
      return response.redirect().toPath('/login')
    }

    // Compteur par compte (#884) : seuls les codes refusés décomptent.
    let attempt: Awaited<ReturnType<ReturnType<typeof twoFactorAccountLimiter>['penalize']>>
    try {
      attempt = await twoFactorAccountLimiter().penalize(twoFactorAccountKey(user.id), async () => {
        const method = await this.twoFactorService.verifyCode(user, code)
        if (method === null) throw new InvalidTwoFactorCodeError()
        return method
      })
    } catch (error) {
      if (!(error instanceof InvalidTwoFactorCodeError)) throw error
      await this.twoFactorService.logFailedChallenge(user)
      session.flashAll()
      session.flash('inputErrorsBag', { code: [i18n.t('validator.twoFactor.invalidCode')] })
      return response.redirect().back()
    }

    if (attempt[0] !== null) {
      // Plafond atteint : on ne vérifie plus rien, et on renvoie au mot de
      // passe — l'état pré-authentifié ne doit pas survivre au blocage.
      clearTwoFactorChallenge(session)
      session.flash('error', i18n.t('flash.twoFactor.rateLimited'))
      return response.redirect().toPath('/login')
    }

    if (attempt[1] === 'recovery') {
      session.flash('info', i18n.t('flash.twoFactor.recoveryUsed'))
    }

    clearTwoFactorChallenge(session)
    const redirectTo = await this.sessionLoginService.complete(
      { auth, session, i18n },
      user,
      pending.remember
    )
    if (redirectTo) return response.redirect().toPath(redirectTo)
    return response.redirect().toRoute('dashboard')
  }
}
