import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import { errors as limiterErrors } from '@adonisjs/limiter'
import { errors as bouncerErrors } from '@adonisjs/bouncer'

/**
 * Méthodes pour lesquelles Bouncer redirige déjà en arrière avec un flash
 * d'erreur (comportement Inertia-friendly conservé, cf. `AuthorizationException`).
 * Tout le reste (GET/HEAD) atterrissait sur un `send('Access denied')` brut.
 */
const FORM_SUBMISSION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '401..403': (_, { inertia }) => inertia.render('errors/forbidden', {}),
    '404': (_, { inertia }) => inertia.render('errors/not_found', {}),
    '500..599': (_, { inertia }) => inertia.render('errors/server_error', {}),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS && ctx.route?.name === 'demo.login') {
      ctx.session.flash('error', ctx.i18n.t('flash.demo.rateLimitError'))
      return ctx.response.redirect().back()
    }
    if (error instanceof QuotaExceededError) {
      const key =
        error.feature === 'storage' && error.alreadyOverLimit
          ? 'flash.quota.storageOverflow'
          : `flash.quota.${error.feature}Exceeded`
      ctx.session.flash('error', ctx.i18n.t(key))
      // Upsell (issue #418) : le toast d'erreur quota expose une action « Voir les
      // offres » vers /settings/billing plutôt qu'un simple message éphémère.
      ctx.session.flash('errorAction', '/settings/billing')
      return ctx.response.redirect().back()
    }
    // Utilisateur authentifié sans organisation sur une route gatée (#279) :
    // redirection propre vers l'accueil plutôt qu'un 500 (TypeError sur PLAN_LIMITS).
    if (error instanceof UserNotInOrganizationError) {
      ctx.session.flash('error', ctx.i18n.t('flash.organization.required'))
      return ctx.response.redirect('/')
    }
    // ACL refusée sur une navigation (#458) : `E_AUTHORIZATION_FAILURE` porte sa
    // propre méthode `handle()`, que le handler de base appelle *avant* les
    // `statusPages` — un GET HTML recevait donc « Access denied » en texte nu,
    // sans layout ni i18n. On rend la page Inertia 403 à la place ; les
    // soumissions de formulaire et les clients JSON gardent le comportement
    // Bouncer (flash + redirect back, ou payload d'erreur).
    if (
      error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE &&
      this.rendersForbiddenPage(error, ctx)
    ) {
      // Contrairement à un contrôleur, la valeur retournée par le handler n'est
      // pas convertie en corps de réponse : on l'envoie explicitement.
      const page = await ctx.inertia.render('errors/forbidden', {})
      return ctx.response.status(403).send(page)
    }
    return super.handle(error, ctx)
  }

  /**
   * Vrai pour une navigation HTML (y compris une visite Inertia) qui n'est pas
   * une soumission de formulaire. `request.accepts()` renvoie `null` quand aucun
   * en-tête `Accept` n'est fourni : Bouncer traite ce cas comme du HTML, on fait
   * de même pour rester aligné.
   *
   * Une policy peut refuser avec un autre statut (`AuthorizationResponse.deny`) :
   * dans ce cas la page 403 mentirait, on laisse la chaîne d'origine répondre.
   */
  private rendersForbiddenPage(
    error: InstanceType<typeof bouncerErrors.E_AUTHORIZATION_FAILURE>,
    ctx: HttpContext
  ): boolean {
    if (!('inertia' in ctx)) return false
    if ((error.response.status ?? 403) !== 403) return false
    if (FORM_SUBMISSION_METHODS.has(ctx.request.method())) return false
    const accepted = ctx.request.accepts(['html', 'application/vnd.api+json', 'json'])
    return accepted === 'html' || accepted === null
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Flux métier géré (redirection dans handle()) — ne pas le journaliser comme
    // une erreur serveur 500 (évite le bruit et les fausses alertes). Cf. #279.
    if (error instanceof UserNotInOrganizationError) {
      return
    }
    return super.report(error, ctx)
  }
}
