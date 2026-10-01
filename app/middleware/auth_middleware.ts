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
    if (user && !user.hasTwoFactorEnabled && !this.#isAllowedWhileBlocked(ctx.request.url())) {
      const enforcement = await this.twoFactorService.enforcementFor(user)
      if (enforcement.blocked) {
        ctx.session.flash('error', ctx.i18n.t('flash.twoFactor.requiredNow'))
        if (ctx.request.method() === 'GET') {
          return ctx.response.redirect().toPath(TWO_FACTOR_SETUP_PATH)
        }
        return ctx.response.redirect().back()
      }
    }

    return next()
  }

  #isAllowedWhileBlocked(path: string): boolean {
    return TWO_FACTOR_ENFORCEMENT_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  }
}
