import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { EMAIL_VERIFICATION_PATH } from '#shared/constants/email_verification'

/**
 * Garde de vérification d'adresse (#768).
 *
 * L'app reste accessible sans vérification : bloquer tout casserait l'essai
 * immédiat, et c'est justement ce que l'inscription sans friction cherche à
 * offrir. Ce que cette garde protège, ce sont les actions qui **engagent des
 * tiers ou de l'argent** — envoyer un e-mail sortant (facture, contrat),
 * inviter un membre, passer au paiement.
 *
 * C'est le compromis : une vérification qui ne garde rien est décorative ;
 * une vérification qui garde tout chasse l'utilisateur avant qu'il ait vu le
 * produit.
 *
 * Posée sur les routes concernées plutôt que dupliquée dans les contrôleurs.
 * À monter **après** `middleware.auth()`, dont elle dépend pour
 * `auth.getUserOrFail()`.
 *
 * Les comptes antérieurs à #768 sont marqués vérifiés par la migration : la
 * garde ne s'applique donc qu'aux inscriptions postérieures.
 */
export default class RequireVerifiedEmailMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    if (user.emailVerifiedAt === null) {
      ctx.session.flash('error', ctx.i18n.t('flash.auth.emailNotVerified'))
      ctx.session.flash('errorAction', EMAIL_VERIFICATION_PATH)
      return ctx.response.redirect().back()
    }

    return next()
  }
}
