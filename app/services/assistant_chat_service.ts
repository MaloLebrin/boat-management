import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  AssistantConversationBudgetExceededError,
  AssistantConversationNotFoundError,
  AssistantCustomKeyFailedError,
  AssistantMaxMessagesReachedError,
  AssistantNoPendingActionError,
  AssistantPendingActionRequiredError,
} from '#exceptions/assistant_errors'
import AiAssistantConversation from '#models/ai_assistant_conversation'
import type Boat from '#models/boat'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type User from '#models/user'
import AiService, { type AiChatMessage } from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import AssistantContextService from '#services/assistant_context_service'
import AssistantToolsService from '#services/assistant_tools_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import OrganizationAiKeyService from '#services/organization_ai_key_service'
import { buildAssistantSystemPrompt, parseAssistantReply } from '#services/assistant_prompt_service'
import type { AiSuggestionLocale } from '#shared/types/ai'
import {
  ASSISTANT_CONVERSATION_TOKEN_BUDGET,
  ASSISTANT_HISTORY_WINDOW,
  ASSISTANT_MAX_USER_MESSAGES,
  type AssistantAiReply,
  type AssistantFleetRoster,
  type AssistantMessage,
  type AssistantTaskProposal,
} from '#shared/types/assistant'
import {
  ASSISTANT_MAX_TOOL_CALLS_PER_TURN,
  ASSISTANT_MAX_TOOL_ROUNDS,
} from '#shared/types/assistant_tools'
import type { AiChatOptions, AiProvider } from '#shared/types/ai'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

/**
 * Chat du copilote FleetAi (panneau global de l'app).
 *
 * Calqué sur `SparePartChatService` (#634) : appel Mistral synchrone dans la
 * requête HTTP, fil en blob JSON, réponse invalide levée AVANT toute écriture.
 *
 * Spécificités :
 * - le contexte flotte (roster + digest planning) est reconstruit à chaque
 *   tour — le prompt système n'est jamais stocké ;
 * - une proposition de tâche est validée contre le roster puis stockée dans
 *   `pendingAction` : l'écriture réelle n'a lieu qu'à la confirmation
 *   explicite, depuis les données stockées côté serveur ;
 * - BYOK : une org avec un fournisseur IA actif (sa propre clé Mistral,
 *   Claude, ChatGPT ou Gemini — chiffrée) consomme sur son compte — le quota
 *   de tokens mensuel de l'app ne s'applique plus, l'usage reste enregistré
 *   pour les statistiques.
 */
@inject()
export default class AssistantChatService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private contextService: AssistantContextService,
    private maintenanceTaskService: BoatMaintenanceTaskService,
    private organizationAiKeyService: OrganizationAiKeyService,
    private toolsService: AssistantToolsService
  ) {}

  /** Conversation active de l'utilisateur (une seule à la fois). */
  async getActiveConversation(user: User): Promise<AiAssistantConversation | null> {
    return AiAssistantConversation.query()
      .where('userId', user.id)
      .where('status', 'active')
      .orderBy('createdAt', 'desc')
      .first()
  }

  /** Démarre une conversation — archive l'éventuelle conversation active. */
  async start(
    user: User,
    message: string,
    locale: AiSuggestionLocale
  ): Promise<AiAssistantConversation> {
    await this.#loadOrganization(user)

    const previous = await this.getActiveConversation(user)
    if (previous !== null) {
      previous.status = 'archived'
      previous.pendingAction = null
      await previous.save()
    }

    const conversation = new AiAssistantConversation()
    conversation.token = randomBytes(6).toString('hex')
    conversation.userId = user.id
    conversation.organizationId = user.organization.id
    conversation.locale = locale
    conversation.status = 'active'
    conversation.messages = []
    conversation.pendingAction = null
    conversation.tokensUsed = 0

    return this.#exchangeWithQuota(conversation, message, user)
  }

  /** Ajoute un message utilisateur à la conversation active. */
  async addMessage(user: User, token: string, message: string): Promise<AiAssistantConversation> {
    await this.#loadOrganization(user)

    const conversation = await this.#findOwnedActiveOrFail(user, token)

    if (conversation.pendingAction !== null) {
      throw new AssistantPendingActionRequiredError()
    }

    const userMessagesCount = conversation.messages.filter((m) => m.role === 'user').length
    if (userMessagesCount >= ASSISTANT_MAX_USER_MESSAGES) {
      throw new AssistantMaxMessagesReachedError()
    }

    if (conversation.tokensUsed >= ASSISTANT_CONVERSATION_TOKEN_BUDGET) {
      throw new AssistantConversationBudgetExceededError()
    }

    return this.#exchangeWithQuota(conversation, message, user)
  }

  /** Conversation active possédant une action en attente — pour la confirmation. */
  async getConversationWithPendingActionOrFail(
    user: User,
    token: string
  ): Promise<{ conversation: AiAssistantConversation; proposal: AssistantTaskProposal }> {
    const conversation = await this.#findOwnedActiveOrFail(user, token)
    if (conversation.pendingAction === null) {
      throw new AssistantNoPendingActionError()
    }
    return { conversation, proposal: conversation.pendingAction }
  }

  /**
   * Exécute la proposition stockée : crée la tâche via le service de
   * maintenance (qui revalide ses règles), vide `pendingAction` et appose la
   * carte de création. Le bateau est chargé et autorisé par le contrôleur
   * (bouncer `MaintenancePolicy.create`) — jamais depuis un payload client.
   */
  async confirmPendingAction(
    user: User,
    boat: Boat,
    conversation: AiAssistantConversation
  ): Promise<{ conversation: AiAssistantConversation; task: BoatMaintenanceTask }> {
    const proposal = conversation.pendingAction
    // Re-lecture défensive : idempotence au double-clic (le premier clic a vidé l'action).
    if (proposal === null) {
      throw new AssistantNoPendingActionError()
    }

    const task = await this.maintenanceTaskService.createForBoat(user, boat, {
      subject: proposal.subject,
      title: proposal.title,
      notes: proposal.notes,
      boatEngineId: proposal.boatEngineId,
      dueAt: proposal.dueAt,
      dueEngineHours: proposal.dueEngineHours,
      recurrenceIntervalMonths: proposal.recurrenceIntervalMonths,
      recurrenceIntervalEngineHours: proposal.recurrenceIntervalEngineHours,
    })

    conversation.pendingAction = null
    conversation.messages = [
      ...conversation.messages,
      {
        role: 'assistant',
        content: '',
        card: {
          kind: 'task_created',
          taskId: task.id,
          boatName: proposal.boatName,
          title: proposal.title,
          dueAt: proposal.dueAt,
          dueEngineHours: proposal.dueEngineHours,
        },
      },
    ]
    await conversation.save()

    return { conversation, task }
  }

  /** Refuse la proposition en attente — le fil reprend. */
  async dismissPendingAction(user: User, token: string): Promise<AiAssistantConversation> {
    const { conversation } = await this.getConversationWithPendingActionOrFail(user, token)

    conversation.pendingAction = null
    conversation.messages = [
      ...conversation.messages,
      { role: 'assistant', content: '', card: { kind: 'task_dismissed' } },
    ]
    await conversation.save()

    return conversation
  }

  /** Archive la conversation active (= « nouvelle conversation »). */
  async archive(user: User, token: string): Promise<void> {
    const conversation = await this.#findOwnedActiveOrFail(user, token)
    conversation.status = 'archived'
    conversation.pendingAction = null
    await conversation.save()
  }

  /**
   * Cycle de quota canonique — sauf BYOK : une org avec un fournisseur actif
   * (sa propre clé Mistral, Claude, ChatGPT ou Gemini) n'est pas soumise au
   * quota de tokens de l'app (consommation sur son compte), l'usage reste
   * émargé pour les statistiques.
   */
  #exchangeWithQuota(
    conversation: AiAssistantConversation,
    message: string,
    user: User
  ): Promise<AiAssistantConversation> {
    return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
      const active = await this.organizationAiKeyService.resolveActiveKey(user.organization)
      if (active === null) {
        const currentUsage = await this.aiTokenQuotaService.getUsage(user.organization.id)
        this.aiTokenQuotaService.assertCanUseTokens(user.organization, currentUsage)
      }
      return this.#exchange(conversation, message, user, active)
    })
  }

  /**
   * Un tour de chat : contexte reconstruit, boucle d'outils bornée (#642),
   * parse + validation des ids contre le roster, puis persistance en une fois
   * — une réponse invalide lève avant toute écriture (invariant #602/#634).
   *
   * Les messages d'outils sont un échafaudage de tour : ils ne sont jamais
   * stockés dans la conversation. Seuls le message utilisateur et la réponse
   * finale entrent dans le blob, ce qui préserve la fenêtre d'historique.
   */
  async #exchange(
    conversation: AiAssistantConversation,
    userMessage: string,
    user: User,
    active: { provider: AiProvider; apiKey: string } | null
  ): Promise<AiAssistantConversation> {
    const roster = await this.contextService.buildFleetRoster(user)

    const pendingMessages: AssistantMessage[] = [
      ...conversation.messages,
      { role: 'user', content: userMessage },
    ]

    const tools = await this.toolsService.definitionsFor(user)
    const options: AiChatOptions = {
      provider: active?.provider ?? 'mistral',
      model: user.organization.aiModelOverride,
      apiKey: active?.apiKey ?? null,
    }

    const scaffold: AiChatMessage[] = await this.#toAiMessages(
      conversation,
      pendingMessages,
      user,
      roster
    )

    let content = ''
    let tokensUsed = 0
    let rounds = 0
    let callsUsed = 0

    // Boucle bornée : tant que le modèle renvoie des appels d'outils, on les
    // exécute et on repousse leurs résultats dans le fil. Budget de la
    // conversation franchi en cours de boucle → un dernier appel sans outils
    // obtient une réponse finale.
    while (true) {
      const withinBudget =
        conversation.tokensUsed + tokensUsed < ASSISTANT_CONVERSATION_TOKEN_BUDGET
      const offerTools =
        tools.length > 0 &&
        rounds < ASSISTANT_MAX_TOOL_ROUNDS &&
        callsUsed < ASSISTANT_MAX_TOOL_CALLS_PER_TURN &&
        withinBudget

      const aiResponse = await this.#chatOrFail(
        scaffold,
        offerTools ? { ...options, tools } : options,
        active
      )
      tokensUsed += aiResponse.tokensUsed

      // Un appel d'outil accompagné de texte est traité comme un appel
      // d'outil : le texte n'est qu'un préambule, pas la réponse finale.
      if (!offerTools || aiResponse.toolCalls.length === 0) {
        content = aiResponse.content
        break
      }

      rounds += 1
      const calls = aiResponse.toolCalls.slice(0, ASSISTANT_MAX_TOOL_CALLS_PER_TURN - callsUsed)
      callsUsed += calls.length

      scaffold.push({ role: 'assistant', content: aiResponse.content, toolCalls: calls })
      for (const call of calls) {
        // `run` ne lève jamais : une erreur repart au modèle comme résultat.
        const result = await this.toolsService.run(
          user,
          call,
          conversation.locale as AiSuggestionLocale
        )
        scaffold.push({ role: 'tool', content: result, toolCallId: call.id })
      }
    }

    const { reply, retryTokens } = await this.#parseWithCorrectiveRetry(
      content,
      scaffold,
      options,
      active,
      conversation.locale as AiSuggestionLocale
    )
    tokensUsed += retryTokens

    // Validations AVANT toute écriture : chaque id rendu par le modèle doit
    // appartenir au roster de l'org.
    let pendingAction: AssistantTaskProposal | null = null
    let assistantMessage: AssistantMessage = { role: 'assistant', content: reply.message }

    if (reply.type === 'answer') {
      // `source` et `navTarget` sortent du vocabulaire fermé validé par le
      // parse — le front les rend en badge i18n et en <Link>, jamais en texte
      // du modèle.
      assistantMessage = {
        role: 'assistant',
        content: reply.message,
        ...(reply.source !== undefined ? { source: reply.source } : {}),
        ...(reply.navTarget !== undefined ? { navTarget: reply.navTarget } : {}),
      }
    }

    if (reply.type === 'propose_task') {
      pendingAction = this.#validateTaskProposal(reply, roster)
    }

    if (reply.type === 'handoff') {
      const boat = roster.boats.find((b) => b.id === reply.boatId)
      const engine = boat?.engines.find((e) => e.id === reply.engineId)
      if (boat === undefined || engine === undefined) {
        throw new AiInvalidResponseError('Assistant handoff names ids outside the fleet roster')
      }
      assistantMessage = {
        role: 'assistant',
        content: reply.message,
        card: {
          kind: 'handoff',
          target: reply.target,
          boatId: boat.id,
          engineId: engine.id,
          boatName: boat.name,
          engineLabel: engine.label,
        },
      }
    }

    conversation.messages = [...pendingMessages, assistantMessage]
    conversation.pendingAction = pendingAction
    conversation.tokensUsed += tokensUsed
    await conversation.save()

    await this.aiTokenQuotaService.recordUsage(user.organization, tokensUsed)

    return conversation
  }

  /**
   * Appel modèle avec la sémantique d'erreur BYOK : un échec avec la clé de
   * l'org (révoquée, invalide, sans crédit) est signalé comme tel —
   * l'utilisateur doit vérifier ses réglages IA.
   */
  async #chatOrFail(
    messages: AiChatMessage[],
    options: AiChatOptions,
    active: { provider: AiProvider; apiKey: string } | null
  ) {
    try {
      return await this.aiService.chat(messages, options)
    } catch (error) {
      if (active !== null) throw new AssistantCustomKeyFailedError()
      throw error
    }
  }

  /**
   * Parse du contenu final avec UNE relance corrective : le petit modèle se
   * trompe régulièrement de forme après une série d'appels d'outils — on lui
   * redemande une seule fois l'objet JSON, sans outils, puis
   * `AiInvalidResponseError` si la relance échoue aussi.
   */
  async #parseWithCorrectiveRetry(
    content: string,
    scaffold: AiChatMessage[],
    options: AiChatOptions,
    active: { provider: AiProvider; apiKey: string } | null,
    locale: AiSuggestionLocale
  ): Promise<{ reply: AssistantAiReply; retryTokens: number }> {
    try {
      return { reply: parseAssistantReply(content), retryTokens: 0 }
    } catch (error) {
      if (!(error instanceof AiInvalidResponseError)) throw error
    }

    const correction =
      locale === 'fr'
        ? 'Réponds uniquement par l’objet JSON demandé, sans aucun texte autour.'
        : 'Reply with only the requested JSON object, with no surrounding text.'

    const retryResponse = await this.#chatOrFail(
      [...scaffold, { role: 'assistant', content }, { role: 'user', content: correction }],
      options,
      active
    )

    return {
      reply: parseAssistantReply(retryResponse.content),
      retryTokens: retryResponse.tokensUsed,
    }
  }

  /** Miroir des règles de `BoatMaintenanceTaskService.createForBoat` + roster. */
  #validateTaskProposal(
    reply: Extract<AssistantAiReply, { type: 'propose_task' }>,
    roster: AssistantFleetRoster
  ): AssistantTaskProposal {
    const { task } = reply

    const boat = roster.boats.find((b) => b.id === task.boatId)
    if (boat === undefined) {
      throw new AiInvalidResponseError('Assistant task proposal names a boat outside the roster')
    }

    let engineLabel: string | null = null
    if (task.boatEngineId !== null) {
      const engine = boat.engines.find((e) => e.id === task.boatEngineId)
      if (engine === undefined) {
        throw new AiInvalidResponseError('Assistant task proposal names an engine outside the boat')
      }
      engineLabel = engine.label
    }

    const hasEngineHours =
      task.dueEngineHours !== null || task.recurrenceIntervalEngineHours !== null
    if (hasEngineHours && task.subject !== 'engine') {
      throw new AiInvalidResponseError('Assistant engine-hour proposal must have subject=engine')
    }
    if (hasEngineHours && task.boatEngineId === null) {
      throw new AiInvalidResponseError('Assistant engine-hour proposal has no boatEngineId')
    }

    return {
      boatId: boat.id,
      boatName: boat.name,
      engineLabel,
      subject: task.subject,
      title: task.title,
      notes: task.notes,
      boatEngineId: task.boatEngineId,
      dueAt: task.dueAt,
      dueEngineHours: task.dueEngineHours,
      recurrenceIntervalMonths: task.recurrenceIntervalMonths,
      recurrenceIntervalEngineHours: task.recurrenceIntervalEngineHours,
    }
  }

  /**
   * Fil envoyé au modèle : prompt système reconstruit à chaque tour (jamais
   * stocké), fenêtre glissante sur l'historique, cartes structurées rendues en
   * texte court pour que le modèle garde le contexte des actions passées.
   */
  async #toAiMessages(
    conversation: AiAssistantConversation,
    pendingMessages: AssistantMessage[],
    user: User,
    roster: AssistantFleetRoster
  ): Promise<AiChatMessage[]> {
    const locale = conversation.locale as AiSuggestionLocale
    const fr = locale === 'fr'

    const thread = pendingMessages.slice(-ASSISTANT_HISTORY_WINDOW).map((m) => ({
      role: m.role,
      content: m.card ? this.#cardToText(m, fr) : m.content,
    }))

    const digestLines = await this.contextService.buildFleetDigestLines(user, locale)

    const systemPrompt = buildAssistantSystemPrompt(locale, {
      orgName: user.organization.name,
      todayIso: DateTime.now().toISODate() ?? '',
      rosterLines: this.contextService.rosterLines(roster),
      rosterTruncated: roster.truncated,
      digestLines,
      customPrompt: user.organization.aiSystemPrompt,
    })

    return [{ role: 'system', content: systemPrompt }, ...thread]
  }

  /** Représentation texte d'une carte pour le fil modèle (jamais affichée). */
  #cardToText(message: AssistantMessage, fr: boolean): string {
    const card = message.card
    if (card === undefined) return message.content
    if (card.kind === 'task_created') {
      return fr
        ? `[Tâche créée : ${card.title} — ${card.boatName}]`
        : `[Task created: ${card.title} — ${card.boatName}]`
    }
    if (card.kind === 'task_dismissed') {
      return fr
        ? '[Proposition de tâche refusée par l’utilisateur]'
        : '[Task proposal dismissed by the user]'
    }
    // handoff : le message du modèle porte déjà le contexte.
    return message.content
  }

  async #findOwnedActiveOrFail(user: User, token: string): Promise<AiAssistantConversation> {
    const conversation = await AiAssistantConversation.findBy('token', token)
    if (
      conversation === null ||
      conversation.userId !== user.id ||
      conversation.status !== 'active'
    ) {
      throw new AssistantConversationNotFoundError()
    }
    return conversation
  }

  async #loadOrganization(user: User): Promise<void> {
    if (user.organization === undefined) {
      await user.load('organization')
    }
  }
}
