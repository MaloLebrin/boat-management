import {
  PartSearchConversationCompletedError,
  PartSearchConversationNotFoundError,
  PartSearchMaxMessagesReachedError,
  PartSearchQuotaExhaustedError,
} from '#exceptions/spare_part_chat_errors'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import AiPartSearchConversation from '#models/ai_part_search_conversation'
import type EngineModel from '#models/engine_model'
import type User from '#models/user'
import AiService from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import EngineCatalogService from '#services/engine_catalog_service'
import EnginePartReferenceService from '#services/engine_part_reference_service'
import {
  buildEngineIdentificationSystemPrompt,
  buildPartSearchFinalTurnInstruction,
  buildPartSearchFirstMessage,
  buildPartSearchSystemPrompt,
  parseSparePartChatReply,
} from '#services/spare_part_chat_prompt_service'
import { SPARE_PART_CATALOG_INDEX } from '#shared/constants/spare_parts/spare_parts_content'
import { engineFamilyFromCatalogModel } from '#shared/helpers/engine_family'
import { assembliesForEngineFamily } from '#shared/helpers/spare_parts'
import type { AiChatMessage, AiSuggestionLocale } from '#shared/types/ai'
import { PLAN_LIMITS } from '#shared/types/plan'
import {
  PART_SEARCH_MAX_USER_MESSAGES,
  PUBLIC_PART_SEARCH_LIFETIME_LIMIT,
  type PartSearchContext,
  type PartSearchResult,
  type PublicPartSearchQuotaProps,
  type PublicPartSearchStartInput,
} from '#shared/types/spare_part_chat'
import type { SparePartCatalogEntry } from '#shared/types/spare_parts'
import { inject } from '@adonisjs/core'
import { randomBytes } from 'node:crypto'

/** Borne dure du prompt d'identification — le corpus réel tient bien en deçà. */
const MAX_MODEL_LINES = 150

/**
 * Chat IA public de recherche de références de pièces (#634, Phase 2) —
 * tunnel d'acquisition marketing, saisie libre marque + numéro de série.
 *
 * Trois régimes de quota, calqués sur `PublicDiagnosisService` (#602) :
 * - visiteur anonyme : `PUBLIC_PART_SEARCH_LIFETIME_LIMIT` conversations,
 *   comptées par la session (liste de tokens) — qui sert aussi de preuve de
 *   propriété pour poster dans une conversation ;
 * - plan sans IA (`starter`) : même plafond, compté en base sur
 *   `organization_id` (la ligne de conversation EST le compteur) ;
 * - plan avec IA (`pro`/`enterprise`) : aucun plafond de conversations, le
 *   cycle de quota tokens existant s'applique.
 *
 * Les conversations publiques partagent `ai_part_search_conversations` avec le
 * chat connecté (Phase 1) et s'en distinguent par `boat_engine_id` **null** :
 * tous les accès d'ici filtrent dessus, dans les deux sens.
 *
 * Anti-hallucination inchangée : le LLM ne rend que des identifiants du
 * vocabulaire injecté, revalidés ici ; la référence affichée provient
 * exclusivement de `engine_part_references`.
 */
@inject()
export default class PublicPartSearchService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private engineCatalogService: EngineCatalogService,
    private partReferenceService: EnginePartReferenceService
  ) {}

  async getQuota(user: User | null, sessionTokens: string[]): Promise<PublicPartSearchQuotaProps> {
    if (user === null) {
      return { used: sessionTokens.length, limit: PUBLIC_PART_SEARCH_LIFETIME_LIMIT }
    }
    await this.#loadOrganization(user)
    if (this.#hasAiPlan(user)) {
      return { used: 0, limit: null }
    }
    return {
      used: await this.#countForOrganization(user.organization.id),
      limit: PUBLIC_PART_SEARCH_LIFETIME_LIMIT,
    }
  }

  /**
   * Dernière conversation **publique** du visiteur : par `userId` pour un
   * connecté, par la liste des tokens de session pour un anonyme — jamais une
   * conversation du chat connecté (`boat_engine_id` non null).
   */
  async getLatestConversation(
    user: User | null,
    sessionTokens: string[]
  ): Promise<AiPartSearchConversation | null> {
    if (user !== null) {
      return AiPartSearchConversation.query()
        .where('userId', user.id)
        .whereNull('boatEngineId')
        .orderBy('createdAt', 'desc')
        .first()
    }
    if (sessionTokens.length === 0) return null
    return AiPartSearchConversation.query()
      .whereIn('token', sessionTokens)
      .whereNull('boatEngineId')
      .orderBy('createdAt', 'desc')
      .first()
  }

  /**
   * Démarre une conversation (1er message). Lève
   * `PartSearchQuotaExhaustedError` si le plafond gratuit est atteint,
   * `QuotaExceededError('ai_tokens')` si le quota mensuel pro/enterprise est
   * épuisé, `AiInvalidResponseError` si la réponse du modèle est
   * inexploitable — dans ces cas rien n'est persisté.
   *
   * Une marque hors catalogue rend l'identification impossible (aucune liste
   * de codes) : l'échec est assumé d'emblée et la conversation démarre en
   * phase `part`, le visiteur garde le repli revendeurs.
   */
  async start(
    user: User | null,
    sessionTokens: string[],
    input: PublicPartSearchStartInput,
    locale: AiSuggestionLocale
  ): Promise<AiPartSearchConversation> {
    if (user === null) {
      if (sessionTokens.length >= PUBLIC_PART_SEARCH_LIFETIME_LIMIT) {
        throw new PartSearchQuotaExhaustedError()
      }
      return this.#createConversation(null, input, locale)
    }

    await this.#loadOrganization(user)

    if (!this.#hasAiPlan(user)) {
      // Plafond starter : sérialisé par le verrou d'org pour éviter deux
      // créations simultanées qui passeraient toutes deux le count.
      return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
        const used = await this.#countForOrganization(user.organization.id)
        if (used >= PUBLIC_PART_SEARCH_LIFETIME_LIMIT) {
          throw new PartSearchQuotaExhaustedError()
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
   * Ajoute un message utilisateur à une conversation publique active. La
   * propriété est prouvée par la session (anonyme) ou par `userId` (connecté).
   */
  async addMessage(
    user: User | null,
    sessionTokens: string[],
    token: string,
    message: string
  ): Promise<AiPartSearchConversation> {
    const conversation = await this.#findOwnedOrFail(user, sessionTokens, token)

    if (conversation.status === 'completed') {
      throw new PartSearchConversationCompletedError()
    }

    const userMessagesCount = conversation.messages.filter((m) => m.role === 'user').length
    if (userMessagesCount >= PART_SEARCH_MAX_USER_MESSAGES) {
      throw new PartSearchMaxMessagesReachedError()
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
    input: PublicPartSearchStartInput,
    locale: AiSuggestionLocale
  ): Promise<AiPartSearchConversation> {
    const catalogBrand = await this.engineCatalogService.resolveBrand(input.brand)

    const conversation = new AiPartSearchConversation()
    conversation.token = randomBytes(6).toString('hex')
    conversation.userId = user?.id ?? null
    conversation.organizationId = user?.organization.id ?? null
    conversation.boatEngineId = null
    conversation.identifiedEngineModelId = null
    conversation.locale = locale
    conversation.status = 'active'
    conversation.phase = catalogBrand !== null ? 'engine' : 'part'
    conversation.context = {
      brand: input.brand,
      model: null,
      serialNumber: input.serialNumber,
      catalogBrandSlug: catalogBrand?.slug ?? null,
      family: null,
      identificationFailed: catalogBrand === null,
    }
    conversation.messages = []
    conversation.result = null
    conversation.tokensUsed = 0

    return this.#exchange(conversation, input.message, user)
  }

  /**
   * Un tour de chat : envoie le fil au modèle, parse et **valide** la réponse,
   * puis persiste messages + état en une fois — une réponse invalide lève
   * avant toute écriture (rien n'est persisté, invariant #602).
   */
  async #exchange(
    conversation: AiPartSearchConversation,
    userMessage: string,
    user: User | null
  ): Promise<AiPartSearchConversation> {
    const pendingMessages: AiChatMessage[] = [
      ...conversation.messages,
      { role: 'user', content: userMessage },
    ]

    const { content, tokensUsed } = await this.aiService.chat(
      await this.#toAiMessages(conversation, pendingMessages)
    )

    const reply = parseSparePartChatReply(content, conversation.phase)

    // Validations AVANT toute écriture : le modèle rapproché par le backend,
    // la clé de pièce contrôlée contre le vocabulaire, la référence lue en base.
    let identifiedModel: EngineModel | null = null
    if (reply.type === 'engine' && reply.modelCode !== null) {
      identifiedModel = await this.engineCatalogService.resolveModelForEngine({
        brand: conversation.context?.brand,
        model: reply.modelCode,
      })
    }

    let result: PartSearchResult | null = null
    if (reply.type === 'part') {
      if (reply.partKey !== null) {
        const vocabulary = this.#vocabularyFor(conversation.context)
        if (!vocabulary.some((entry) => entry.key === reply.partKey)) {
          throw new AiInvalidResponseError('Part search reply names a key outside the catalog')
        }
      }
      const reference =
        reply.partKey === null
          ? null
          : await this.partReferenceService.forEngineModelPart(
              conversation.identifiedEngineModelId,
              reply.partKey
            )
      result = { partKey: reply.partKey, reference }
    }

    conversation.messages = [...pendingMessages, { role: 'assistant', content: reply.message }]

    if (reply.type === 'engine') {
      if (identifiedModel !== null) {
        conversation.identifiedEngineModelId = identifiedModel.id
        if (conversation.context !== null) {
          // Snapshot d'affichage (liens revendeurs, prompts suivants) et
          // famille du modèle — elle rétrécit le vocabulaire de la phase pièce.
          conversation.context = {
            ...conversation.context,
            model: identifiedModel.modelCode ?? identifiedModel.name,
            family: engineFamilyFromCatalogModel(identifiedModel),
          }
        }
      } else if (conversation.context !== null) {
        // Code non rendu ou non rapprochable : échec honnête — l'écran affiche
        // le repli statique, jamais un texte LLM.
        conversation.context = { ...conversation.context, identificationFailed: true }
      }
      conversation.phase = 'part'
    }

    if (result !== null) {
      conversation.result = result
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
   * Fil envoyé au modèle : prompt système reconstruit à chaque tour selon la
   * **phase** (jamais stocké), 1er message utilisateur reconstruit avec le
   * contexte saisi, instruction de clôture au dernier tour autorisé.
   */
  async #toAiMessages(
    conversation: AiPartSearchConversation,
    pendingMessages: AiChatMessage[]
  ): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const locale = conversation.locale as AiSuggestionLocale
    const context = conversation.context
    const userMessagesCount = pendingMessages.filter((m) => m.role === 'user').length
    const isFinalTurn = userMessagesCount >= PART_SEARCH_MAX_USER_MESSAGES

    let userIndex = 0
    const thread = pendingMessages.map((m) => {
      if (m.role !== 'user') return { role: m.role, content: m.content }
      userIndex += 1
      let content = m.content
      if (userIndex === 1) {
        content = buildPartSearchFirstMessage(
          {
            message: m.content,
            brand: context?.brand ?? null,
            model: context?.model ?? null,
            serialNumber: context?.serialNumber ?? null,
          },
          locale
        )
      }
      if (userIndex === userMessagesCount && isFinalTurn) {
        content = `${content}\n\n${buildPartSearchFinalTurnInstruction(locale, conversation.phase)}`
      }
      return { role: m.role, content }
    })

    const systemPrompt =
      conversation.phase === 'engine'
        ? await this.#buildEnginePrompt(conversation, locale)
        : await this.#buildPartPrompt(conversation, locale)

    return [{ role: 'system', content: systemPrompt }, ...thread]
  }

  async #buildEnginePrompt(
    conversation: AiPartSearchConversation,
    locale: AiSuggestionLocale
  ): Promise<string> {
    const context = conversation.context
    // La phase `engine` n'existe que pour une marque résolue (cf. `start`).
    const brand = await this.engineCatalogService.resolveBrand(context?.brand)

    const models = brand
      ? await this.engineCatalogService.listModels({ brandId: brand.id, limit: MAX_MODEL_LINES })
      : []
    const modelLines = models
      .map((model) =>
        model.modelCode ? `- ${model.name} — ${model.modelCode}` : `- ${model.name}`
      )
      .join('\n')

    return buildEngineIdentificationSystemPrompt(
      locale,
      {
        brandName: brand?.name ?? context?.brand ?? '',
        serialNumber: context?.serialNumber ?? null,
        referencePattern: brand?.referencePattern ?? null,
        modelLines,
      },
      'informal'
    )
  }

  async #buildPartPrompt(
    conversation: AiPartSearchConversation,
    locale: AiSuggestionLocale
  ): Promise<string> {
    const context = conversation.context

    let engineLabel = [context?.brand, context?.model].filter(Boolean).join(' ')
    if (conversation.identifiedEngineModelId !== null) {
      const identified = await this.engineCatalogService.resolveModelForEngine({
        engineModelId: conversation.identifiedEngineModelId,
      })
      if (identified) {
        engineLabel = [context?.brand, identified.name].filter(Boolean).join(' ')
      }
    }

    const vocabularyLines = this.#vocabularyFor(context)
      .map((entry) => `- ${entry.key}${entry.catalogName ? ` — ${entry.catalogName}` : ''}`)
      .join('\n')

    return buildPartSearchSystemPrompt(
      locale,
      {
        engineLabel:
          engineLabel || (locale === 'fr' ? 'moteur non identifié' : 'unidentified engine'),
        vocabularyLines,
      },
      'informal'
    )
  }

  /**
   * Vocabulaire fermé servi au modèle. Famille connue (modèle identifié) :
   * même filtre que le chat connecté. Famille inconnue : **catalogue complet**
   * — le repli générique de `assembliesForEngineFamily(null)` (démarrage et
   * commandes) est pensé pour un moteur de la flotte au profil incomplet, pas
   * pour un visiteur dont on ne sait rien ; ici la pièce demandée peut venir
   * de n'importe quelle famille.
   */
  #vocabularyFor(context: PartSearchContext | null): SparePartCatalogEntry[] {
    const family = context?.family ?? null
    if (family === null) {
      return [...SPARE_PART_CATALOG_INDEX.values()]
    }

    const familySlugs = new Set(assembliesForEngineFamily(family).map((assembly) => assembly.slug))

    return [...SPARE_PART_CATALOG_INDEX.values()].filter(
      (entry) => entry.assemblySlug === null || familySlugs.has(entry.assemblySlug)
    )
  }

  /**
   * Propriété d'une conversation publique : le token doit exister **hors chat
   * connecté** (`boat_engine_id` null) et appartenir au visiteur — `userId`
   * pour un connecté, présence dans la session pour un anonyme.
   */
  async #findOwnedOrFail(
    user: User | null,
    sessionTokens: string[],
    token: string
  ): Promise<AiPartSearchConversation> {
    const conversation = await AiPartSearchConversation.findBy('token', token)
    if (conversation === null || conversation.boatEngineId !== null) {
      throw new PartSearchConversationNotFoundError()
    }
    const owned =
      user !== null ? conversation.userId === user.id : sessionTokens.includes(conversation.token)
    if (!owned) {
      throw new PartSearchConversationNotFoundError()
    }
    return conversation
  }

  /** Conversations publiques de l'org — le plafond des plans sans IA. */
  async #countForOrganization(organizationId: number): Promise<number> {
    const rows = await AiPartSearchConversation.query()
      .where('organizationId', organizationId)
      .whereNull('boatEngineId')
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
