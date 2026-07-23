import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import { errors as limiterErrors } from '@adonisjs/limiter'

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
    return super.handle(error, ctx)
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
