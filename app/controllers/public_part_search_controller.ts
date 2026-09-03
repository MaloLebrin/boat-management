import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  PartSearchConversationCompletedError,
  PartSearchConversationNotFoundError,
  PartSearchMaxMessagesReachedError,
  PartSearchQuotaExhaustedError,
} from '#exceptions/spare_part_chat_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import PublicPartSearchService from '#services/public_part_search_service'
import { toPublicPartSearchConversationProps } from '#transformers/spare_part_chat_transformer'
import {
  publicPartSearchMessageValidator,
  publicPartSearchStartValidator,
} from '#validators/spare_part_chat'
import { toAppLocale } from '#shared/helpers/locale_path'
import { PUBLIC_PART_SEARCH_SESSION_KEY } from '#shared/types/spare_part_chat'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Chat IA public de recherche de références de pièces (#634, Phase 2) —
 * tunnel d'acquisition.
 *
 * Page hybride (pattern `PublicDiagnosisController` #602) : rendue aux
 * anonymes comme aux connectés, `silent_auth_middleware` ayant déjà hydraté
 * `ctx.auth.user`. Les mutations suivent la convention Inertia du repo :
 * flash + `redirect().back()`, jamais de JSON.
 */
@inject()
export default class PublicPartSearchController {
  constructor(private publicPartSearchService: PublicPartSearchService) {}

  async show({ inertia, auth, session, i18n }: HttpContext) {
    const isAuthenticated = await auth.check()
    const user = isAuthenticated ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const [quota, conversation] = await Promise.all([
      this.publicPartSearchService.getQuota(user, sessionTokens),
      this.publicPartSearchService.getLatestConversation(user, sessionTokens),
    ])

    return inertia.render('marketing/parts_ai', {
      isAuthenticated,
      locale: toAppLocale(i18n.locale),
      quota,
      conversation: conversation ? toPublicPartSearchConversationProps(conversation) : null,
    })
  }

  async start({ request, response, auth, session, i18n }: HttpContext) {
    const user = (await auth.check()) ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const payload = await request.validateUsing(publicPartSearchStartValidator)

    try {
      const conversation = await this.publicPartSearchService.start(
        user,
        sessionTokens,
        {
          message: payload.message,
          brand: payload.brand ?? null,
          serialNumber: payload.serialNumber ?? null,
        },
        toAppLocale(i18n.locale)
      )
      if (user === null) {
        session.put(PUBLIC_PART_SEARCH_SESSION_KEY, [...sessionTokens, conversation.token])
      }
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async message({ request, response, auth, params, session, i18n }: HttpContext) {
    const user = (await auth.check()) ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const payload = await request.validateUsing(publicPartSearchMessageValidator)

    try {
      await this.publicPartSearchService.addMessage(
        user,
        sessionTokens,
        String(params.token),
        payload.message
      )
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  #sessionTokens(session: HttpContext['session']): string[] {
    const stored: unknown = session.get(PUBLIC_PART_SEARCH_SESSION_KEY)
    if (!Array.isArray(stored)) return []
    return stored.filter((token): token is string => typeof token === 'string')
  }

  #flashError(error: unknown, session: HttpContext['session'], i18n: HttpContext['i18n']): void {
    if (error instanceof PartSearchQuotaExhaustedError) {
      session.flash('error', i18n.t('flash.publicPartSearch.quotaExhausted'))
    } else if (error instanceof PartSearchConversationNotFoundError) {
      session.flash('error', i18n.t('flash.publicPartSearch.notFound'))
    } else if (error instanceof PartSearchConversationCompletedError) {
      session.flash('error', i18n.t('flash.publicPartSearch.conversationCompleted'))
    } else if (error instanceof PartSearchMaxMessagesReachedError) {
      session.flash('error', i18n.t('flash.publicPartSearch.maxMessagesReached'))
    } else if (error instanceof QuotaExceededError) {
      session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
    } else if (error instanceof AiInvalidResponseError) {
      session.flash('error', i18n.t('flash.ai.diagnosisInvalidResponse'))
    } else {
      throw error
    }
  }
}
