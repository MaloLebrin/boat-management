import {
  DiagnosisConversationCompletedError,
  DiagnosisConversationNotFoundError,
  DiagnosisMaxMessagesReachedError,
  DiagnosisQuotaExhaustedError,
} from '#exceptions/public_diagnosis_errors'
import AiDiagnosisConversation from '#models/ai_diagnosis_conversation'
import type User from '#models/user'
import AiService from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import {
  buildFinalTurnInstruction,
  buildPublicDiagnosisFirstMessage,
  buildPublicDiagnosisSystemPrompt,
  parsePublicDiagnosisReply,
} from '#services/public_diagnosis_prompt_service'
import type { AiChatMessage, AiSuggestionLocale } from '#shared/types/ai'
import { PLAN_LIMITS } from '#shared/types/plan'
import {
  PUBLIC_DIAGNOSIS_LIFETIME_LIMIT,
  PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES,
  type PublicDiagnosisQuotaProps,
  type PublicDiagnosisStartInput,
} from '#shared/types/public_diagnosis'
import { inject } from '@adonisjs/core'
import { randomBytes } from 'node:crypto'

/**
 * Chat IA public de diagnostic de panne (#602).
 *
 * Trois régimes de quota, selon qui parle :
 * - visiteur anonyme : `PUBLIC_DIAGNOSIS_LIFETIME_LIMIT` conversations,
 *   comptées par la session (liste de tokens) — qui sert aussi de preuve de
 *   propriété pour poster dans une conversation ;
 * - plan sans IA (`starter`) : même plafond, compté en base sur
 *   `organization_id` (la ligne de conversation EST le compteur) ;
 * - plan avec IA (`pro`/`enterprise`) : aucun plafond de conversations, le
 *   cycle de quota tokens existant s'applique (pattern
 *   `AiAnalysisService.generateEngineDiagnosis`).
 *
 * L'appel Mistral est synchrone dans la requête HTTP : le job `RunAiChat` ne
 * persiste pas sa réponse et un chat ne peut pas attendre un reload de queue.
 */
@inject()
export default class PublicDiagnosisService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService
  ) {}

  async getQuota(user: User | null, sessionTokens: string[]): Promise<PublicDiagnosisQuotaProps> {
    if (user === null) {
      return { used: sessionTokens.length, limit: PUBLIC_DIAGNOSIS_LIFETIME_LIMIT }
    }
    await this.#loadOrganization(user)
    if (this.#hasAiPlan(user)) {
      return { used: 0, limit: null }
    }
    return {
      used: await this.#countForOrganization(user.organization.id),
      limit: PUBLIC_DIAGNOSIS_LIFETIME_LIMIT,
    }
  }

  /**
   * Dernière conversation du visiteur : par `userId` pour un connecté, par la
   * liste des tokens de session pour un anonyme.
   */
  async getLatestConversation(
    user: User | null,
    sessionTokens: string[]
  ): Promise<AiDiagnosisConversation | null> {
    if (user !== null) {
      return AiDiagnosisConversation.query()
        .where('userId', user.id)
        .orderBy('createdAt', 'desc')
        .first()
    }
    if (sessionTokens.length === 0) return null
    return AiDiagnosisConversation.query()
      .whereIn('token', sessionTokens)
      .orderBy('createdAt', 'desc')
      .first()
  }

  /**
   * Démarre une conversation (1er message). Lève
   * `DiagnosisQuotaExhaustedError` si le plafond gratuit est atteint,
   * `QuotaExceededError('ai_tokens')` si le quota mensuel pro/enterprise est
   * épuisé, `AiInvalidResponseError` si la réponse du modèle est
   * inexploitable — dans ces cas rien n'est persisté.
   */
  async start(
    user: User | null,
    sessionTokens: string[],
    input: PublicDiagnosisStartInput,
    locale: AiSuggestionLocale
  ): Promise<AiDiagnosisConversation> {
    if (user === null) {
      if (sessionTokens.length >= PUBLIC_DIAGNOSIS_LIFETIME_LIMIT) {
        throw new DiagnosisQuotaExhaustedError()
      }
      return this.#createConversation(null, input, locale)
    }

    await this.#loadOrganization(user)

    if (!this.#hasAiPlan(user)) {
      // Plafond starter : sérialisé par le verrou d'org pour éviter deux
      // créations simultanées qui passeraient toutes deux le count.
      return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
        const used = await this.#countForOrganization(user.organization.id)
        if (used >= PUBLIC_DIAGNOSIS_LIFETIME_LIMIT) {
          throw new DiagnosisQuotaExhaustedError()
        }
        return this.#createConversation(user, input, locale)
      })
    }

    return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
      const currentUsage = await this.aiTokenQuotaService.getUsage(user.organization.id)
      this.aiTokenQuotaService.assertCanUseTokens(user.organization, currentUsage)
      return this.#createConversation(user, input, locale)
    })
  }

  /**
   * Ajoute un message utilisateur à une conversation active et rend la
   * réponse du modèle. La propriété est prouvée par la session (anonyme) ou
   * par `userId` (connecté).
   */
  async addMessage(
    user: User | null,
    sessionTokens: string[],
    token: string,
    message: string
  ): Promise<AiDiagnosisConversation> {
    const conversation = await this.#findOwnedOrFail(user, sessionTokens, token)

    if (conversation.status === 'completed') {
      throw new DiagnosisConversationCompletedError()
    }

    const userMessagesCount = conversation.messages.filter((m) => m.role === 'user').length
    if (userMessagesCount >= PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES) {
      throw new DiagnosisMaxMessagesReachedError()
    }

    if (user !== null) {
      await this.#loadOrganization(user)
      if (this.#hasAiPlan(user)) {
        return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
          const currentUsage = await this.aiTokenQuotaService.getUsage(user.organization.id)
          this.aiTokenQuotaService.assertCanUseTokens(user.organization, currentUsage)
          return this.#exchange(conversation, message, user)
        })
      }
    }

    return this.#exchange(conversation, message, user)
  }

  async #createConversation(
    user: User | null,
    input: PublicDiagnosisStartInput,
    locale: AiSuggestionLocale
  ): Promise<AiDiagnosisConversation> {
    const conversation = new AiDiagnosisConversation()
    conversation.token = randomBytes(6).toString('hex')
    conversation.userId = user?.id ?? null
    conversation.organizationId = user?.organization.id ?? null
    conversation.locale = locale
    conversation.status = 'active'
    conversation.context = {
      engineType: input.engineType,
      brand: input.brand,
      hours: input.hours,
    }
    conversation.messages = []
    conversation.result = null
    conversation.tokensUsed = 0

    return this.#exchange(conversation, input.message, user)
  }

  /**
   * Un tour de chat : envoie le fil au modèle, parse la réponse, puis
   * persiste messages + résultat en une fois — une réponse invalide lève
   * avant toute écriture (rien n'est persisté, comme #516).
   */
  async #exchange(
    conversation: AiDiagnosisConversation,
    userMessage: string,
    user: User | null
  ): Promise<AiDiagnosisConversation> {
    const pendingMessages: AiChatMessage[] = [
      ...conversation.messages,
      { role: 'user', content: userMessage },
    ]

    const { content, tokensUsed } = await this.aiService.chat(
      this.#toAiMessages(conversation, pendingMessages)
    )

    const reply = parsePublicDiagnosisReply(content)

    conversation.messages = [
      ...pendingMessages,
      {
        role: 'assistant',
        content: reply.type === 'question' ? reply.message : reply.result.summary,
      },
    ]
    if (reply.type === 'diagnosis') {
      conversation.result = reply.result
      conversation.status = 'completed'
    }
    conversation.tokensUsed += tokensUsed
    await conversation.save()

    // Suivi des coûts : les tokens des plans avec IA émargent au quota
    // mensuel existant ; ceux des anonymes/starter restent tracés sur la
    // conversation (`tokensUsed`) sans compteur d'org.
    if (user !== null && this.#hasAiPlan(user)) {
      await this.aiTokenQuotaService.recordUsage(user.organization, tokensUsed)
    }

    return conversation
  }

  /**
   * Fil envoyé au modèle : le 1er message utilisateur est reconstruit avec le
   * contexte moteur (le fil stocké ne garde que le texte tapé, affiché tel
   * quel) ; au dernier tour autorisé, l'instruction de clôture force la
   * sortie `diagnosis`.
   */
  #toAiMessages(
    conversation: AiDiagnosisConversation,
    pendingMessages: AiChatMessage[]
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const locale = conversation.locale as AiSuggestionLocale
    const userMessagesCount = pendingMessages.filter((m) => m.role === 'user').length
    const isFinalTurn = userMessagesCount >= PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES

    let userIndex = 0
    const thread = pendingMessages.map((m) => {
      if (m.role !== 'user') return { role: m.role, content: m.content }
      userIndex += 1
      let content = m.content
      if (userIndex === 1) {
        content = buildPublicDiagnosisFirstMessage(
          {
            message: m.content,
            engineType: conversation.context?.engineType ?? null,
            brand: conversation.context?.brand ?? null,
            hours: conversation.context?.hours ?? null,
          },
          locale
        )
      }
      if (userIndex === userMessagesCount && isFinalTurn) {
        content = `${content}\n\n${buildFinalTurnInstruction(locale)}`
      }
      return { role: m.role, content }
    })

    return [{ role: 'system', content: buildPublicDiagnosisSystemPrompt(locale) }, ...thread]
  }

  async #findOwnedOrFail(
    user: User | null,
    sessionTokens: string[],
    token: string
  ): Promise<AiDiagnosisConversation> {
    const conversation = await AiDiagnosisConversation.findBy('token', token)
    if (conversation === null) {
      throw new DiagnosisConversationNotFoundError()
    }
    const owned =
      user !== null ? conversation.userId === user.id : sessionTokens.includes(conversation.token)
    if (!owned) {
      throw new DiagnosisConversationNotFoundError()
    }
    return conversation
  }

  async #countForOrganization(organizationId: number): Promise<number> {
    const rows = await AiDiagnosisConversation.query()
      .where('organizationId', organizationId)
      .count('* as total')
    return Number(rows[0].$extras.total)
  }

  async #loadOrganization(user: User): Promise<void> {
    if (user.organization === undefined) {
      await user.load('organization')
    }
  }

  #hasAiPlan(user: User): boolean {
    return PLAN_LIMITS[user.organization.plan].canUseAI
  }
}
