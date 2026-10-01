import type User from '#models/user'
import TwoFactorService from '#services/two_factor_service'
import { TWO_FACTOR_SETUP_PATH } from '#shared/constants/two_factor'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Routes ouvertes à un membre que la politique d'organisation bloque (#884) :
 * de quoi activer la 2FA, vérifier son adresse et se déconnecter — rien d'autre.
 */
const TWO_FACTOR_ENFORCEMENT_ALLOWED_PREFIXES = [
  TWO_FACTOR_SETUP_PATH,
  '/settings/two-factor',
  '/logout',
  '/verify-email',
]

@inject()
export default class AuthMiddleware {
  redirectTo = '/login'

  constructor(private twoFactorService: TwoFactorService) {}

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })

    // Politique 2FA de l'organisation (#884) : une fois le délai de grâce
    // écoulé, un membre sans second facteur n'a plus accès qu'à l'activation.
    // Posé ici, sur toutes les routes authentifiées, plutôt que route par route.
    const user = ctx.auth.user
    if (!user || user.hasTwoFactorEnabled || this.#isAllowedWhileBlocked(ctx.request.url())) {
      return next()
    }

    // Une mutation est arrêtée **avant** de s'exécuter.
    if (ctx.request.method() !== 'GET') {
      if (await this.#isBlocked(user)) {
        ctx.session.flash('error', ctx.i18n.t('flash.twoFactor.requiredNow'))
        return ctx.response.redirect().back()
      }
      return next()
    }

    // Une lecture est vérifiée **après** le contrôleur : l'organisation est
    // alors déjà chargée (contrôleur ou middleware Inertia) et la vérification
    // ne coûte aucune requête de plus sur chaque page — garde-fou de
    // `boat_show_queries.spec.ts`. Rien n'est encore parti : le corps de la
    // réponse est paresseux, et la redirection le remplace entièrement.
    await next()
    if (await this.#isBlocked(user)) {
      ctx.session.flash('error', ctx.i18n.t('flash.twoFactor.requiredNow'))
      ctx.response.removeHeader('content-disposition')
      ctx.response.status(302)
      ctx.response.redirect().toPath(TWO_FACTOR_SETUP_PATH)
    }
  }

  async #isBlocked(user: User): Promise<boolean> {
    const enforcement = await this.twoFactorService.enforcementFor(user)
    return enforcement.blocked
  }

  #isAllowedWhileBlocked(path: string): boolean {
    return TWO_FACTOR_ENFORCEMENT_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  }
}
