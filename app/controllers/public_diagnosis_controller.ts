import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  DiagnosisConversationCompletedError,
  DiagnosisConversationNotFoundError,
  DiagnosisMaxMessagesReachedError,
  DiagnosisQuotaExhaustedError,
} from '#exceptions/public_diagnosis_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import PublicDiagnosisService from '#services/public_diagnosis_service'
import { toPublicDiagnosisConversationProps } from '#transformers/public_diagnosis_transformer'
import {
  publicDiagnosisMessageValidator,
  publicDiagnosisStartValidator,
} from '#validators/public_diagnosis'
import { toAppLocale } from '#shared/helpers/locale_path'
import { PUBLIC_DIAGNOSIS_SESSION_KEY } from '#shared/types/public_diagnosis'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Chat IA public de diagnostic de panne (#602) — tunnel d'acquisition.
 *
 * Page hybride (pattern `MarketingController.simulator`) : rendue aux
 * anonymes comme aux connectés, `silent_auth_middleware` ayant déjà hydraté
 * `ctx.auth.user`. Les mutations suivent la convention Inertia du repo :
 * flash + `redirect().back()`, jamais de JSON.
 */
@inject()
export default class PublicDiagnosisController {
  constructor(private publicDiagnosisService: PublicDiagnosisService) {}

  async show({ inertia, auth, session, i18n }: HttpContext) {
    const isAuthenticated = await auth.check()
    const user = isAuthenticated ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const [quota, conversation] = await Promise.all([
      this.publicDiagnosisService.getQuota(user, sessionTokens),
      this.publicDiagnosisService.getLatestConversation(user, sessionTokens),
    ])

    return inertia.render('marketing/diagnosis_ai', {
      isAuthenticated,
      locale: toAppLocale(i18n.locale),
      quota,
      conversation: conversation ? toPublicDiagnosisConversationProps(conversation) : null,
    })
  }

  async start({ request, response, auth, session, i18n }: HttpContext) {
    const user = (await auth.check()) ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const payload = await request.validateUsing(publicDiagnosisStartValidator)

    try {
      const conversation = await this.publicDiagnosisService.start(
        user,
        sessionTokens,
        {
          message: payload.message,
          engineType: payload.engineType ?? null,
          brand: payload.brand ?? null,
          hours: payload.hours ?? null,
        },
        toAppLocale(i18n.locale)
      )
      if (user === null) {
        session.put(PUBLIC_DIAGNOSIS_SESSION_KEY, [...sessionTokens, conversation.token])
      }
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async message({ request, response, auth, params, session, i18n }: HttpContext) {
    const user = (await auth.check()) ? auth.getUserOrFail() : null
    const sessionTokens = this.#sessionTokens(session)

    const payload = await request.validateUsing(publicDiagnosisMessageValidator)

    try {
      await this.publicDiagnosisService.addMessage(
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
    const stored: unknown = session.get(PUBLIC_DIAGNOSIS_SESSION_KEY)
    if (!Array.isArray(stored)) return []
    return stored.filter((token): token is string => typeof token === 'string')
  }

  #flashError(error: unknown, session: HttpContext['session'], i18n: HttpContext['i18n']): void {
    if (error instanceof DiagnosisQuotaExhaustedError) {
      session.flash('error', i18n.t('flash.publicDiagnosis.quotaExhausted'))
    } else if (error instanceof DiagnosisConversationNotFoundError) {
      session.flash('error', i18n.t('flash.publicDiagnosis.notFound'))
    } else if (error instanceof DiagnosisConversationCompletedError) {
      session.flash('error', i18n.t('flash.publicDiagnosis.conversationCompleted'))
    } else if (error instanceof DiagnosisMaxMessagesReachedError) {
      session.flash('error', i18n.t('flash.publicDiagnosis.maxMessagesReached'))
    } else if (error instanceof QuotaExceededError) {
      session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
    } else if (error instanceof AiInvalidResponseError) {
      session.flash('error', i18n.t('flash.ai.diagnosisInvalidResponse'))
    } else {
      throw error
    }
  }
}
