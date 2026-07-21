import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'

/**
 * The "DetectUserLocaleMiddleware" middleware uses i18n service to share
 * a request specific i18n object with the HTTP Context
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Using i18n for validation messages. Applicable to only
   * "request.validateUsing" method calls
   */
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  /**
   * This method reads the user language from the "Accept-Language"
   * header and returns the best matching locale by checking it
   * against the supported locales.
   *
   * Feel free to use different mechanism for finding user language.
   */
  protected getUrlLocale(ctx: HttpContext): 'en' | 'fr' | null {
    const firstSegment = ctx.request.url().split('?')[0].split('/').filter(Boolean)[0]
    return firstSegment === 'en' || firstSegment === 'fr' ? firstSegment : null
  }

  protected getRequestLocale(ctx: HttpContext, urlLocale: 'en' | 'fr' | null) {
    if (urlLocale) {
      return urlLocale
    }

    const cookieLocale = ctx.request.cookie('locale')
    if (cookieLocale === 'en' || cookieLocale === 'fr') {
      return cookieLocale
    }

    const userLanguages = ctx.request.languages()
    return i18nManager.getSupportedLocaleFor(userLanguages)
  }

  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Finding user language
     */
    const urlLocale = this.getUrlLocale(ctx)
    const language = this.getRequestLocale(ctx, urlLocale)

    /**
     * A locale carried by the URL prefix (/en/..., /fr/...) is a stronger signal
     * than a stale cookie — refresh it so unprefixed routes (/login, /contact...)
     * pick up the locale the visitor is actually browsing in.
     */
    if (urlLocale && ctx.request.cookie('locale') !== urlLocale) {
      ctx.response.cookie('locale', urlLocale, { maxAge: '365d', path: '/', httpOnly: false })
    }

    /**
     * Assigning i18n property to the HTTP context
     */
    ctx.i18n = i18nManager.locale(language || i18nManager.defaultLocale)

    /**
     * Binding I18n class to the request specific instance of it.
     * Doing so will allow IoC container to resolve an instance
     * of request specific i18n object when I18n class is
     * injected somewhere.
     */
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    /**
     * Sharing request specific instance of i18n with edge
     * templates.
     *
     * Remove the following block of code, if you are not using
     * edge templates.
     */
    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    return next()
  }
}

/**
 * Notify TypeScript about i18n property
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
