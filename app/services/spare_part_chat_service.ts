import {
  PartSearchConversationCompletedError,
  PartSearchConversationNotFoundError,
  PartSearchMaxMessagesReachedError,
} from '#exceptions/spare_part_chat_errors'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import AiPartSearchConversation from '#models/ai_part_search_conversation'
import type BoatEngine from '#models/boat_engine'
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
import { assembliesForEngineFamily, resolveEngineFamily } from '#shared/helpers/spare_parts'
import type { AiChatMessage, AiSuggestionLocale } from '#shared/types/ai'
import {
  PART_SEARCH_MAX_USER_MESSAGES,
  type PartSearchContext,
  type PartSearchResult,
} from '#shared/types/spare_part_chat'
import type { SparePartCatalogEntry } from '#shared/types/spare_parts'
import { inject } from '@adonisjs/core'
import { randomBytes } from 'node:crypto'

/** Borne dure du prompt d'identification — le corpus réel tient bien en deçà. */
const MAX_MODEL_LINES = 150

/**
 * Chat IA de recherche de références de pièces par numéro de série (#634).
 *
 * Calqué sur `PublicDiagnosisService` (#602) : appel Mistral synchrone dans la
 * requête HTTP, fil en blob JSON, réponse invalide levée AVANT toute écriture.
 * Réservé aux plans avec IA (le contrôleur garde `assertCanUseAI`) — le cycle
 * de quota de tokens mensuel s'applique sans plafond de conversations.
 *
 * Anti-hallucination : le LLM ne rend que des identifiants du vocabulaire
 * injecté (`modelCode` de la marque, `partKey` du catalogue), revalidés ici ;
 * la référence affichée provient exclusivement de `engine_part_references`.
 */
@inject()
export default class SparePartChatService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private engineCatalogService: EngineCatalogService,
    private partReferenceService: EnginePartReferenceService
  ) {}

  /** Dernière conversation de l'utilisateur pour ce moteur. */
  async getLatestConversation(
    user: User,
    engine: BoatEngine
  ): Promise<AiPartSearchConversation | null> {
    return AiPartSearchConversation.query()
      .where('userId', user.id)
      .where('boatEngineId', engine.id)
      .orderBy('createdAt', 'desc')
      .first()
  }

  /**
   * Démarre une conversation (1er message). Court-circuit décisif : un moteur
   * dont le modèle est déjà résolu par le catalogue (#573) démarre directement
   * en phase `part` — aucun token dépensé pour l'identification. Une marque
   * hors catalogue rend l'identification impossible (aucune liste de codes) :
   * l'échec est assumé d'emblée et la conversation passe quand même en phase
   * `part`, l'utilisateur garde le repli revendeurs.
   */
  async start(
    user: User,
    engine: BoatEngine,
    message: string,
    locale: AiSuggestionLocale
  ): Promise<AiPartSearchConversation> {
    await this.#loadOrganization(user)

    const catalogBrand = await this.engineCatalogService.resolveBrand(engine.brand)
    const model = await this.engineCatalogService.resolveModelForEngine(engine)

    const conversation = new AiPartSearchConversation()
    conversation.token = randomBytes(6).toString('hex')
    conversation.userId = user.id
    conversation.organizationId = user.organization.id
    conversation.boatEngineId = engine.id
    conversation.identifiedEngineModelId = model?.id ?? null
    conversation.locale = locale
    conversation.status = 'active'
    conversation.phase = model !== null || catalogBrand === null ? 'part' : 'engine'
    conversation.context = {
      brand: engine.brand,
      model: engine.model,
      serialNumber: engine.serialNumber,
      catalogBrandSlug: catalogBrand?.slug ?? null,
      family: resolveEngineFamily(engine),
      identificationFailed: model === null && catalogBrand === null,
    }
    conversation.messages = []
    conversation.result = null
    conversation.tokensUsed = 0

    return this.#exchangeWithQuota(conversation, message, user)
  }

  /** Ajoute un message utilisateur à une conversation active du moteur. */
  async addMessage(
    user: User,
    engine: BoatEngine,
    token: string,
    message: string
  ): Promise<AiPartSearchConversation> {
    await this.#loadOrganization(user)

    const conversation = await this.#findOwnedOrFail(user, engine, token)

    if (conversation.status === 'completed') {
      throw new PartSearchConversationCompletedError()
    }

    const userMessagesCount = conversation.messages.filter((m) => m.role === 'user').length
    if (userMessagesCount >= PART_SEARCH_MAX_USER_MESSAGES) {
      throw new PartSearchMaxMessagesReachedError()
    }

    return this.#exchangeWithQuota(conversation, message, user)
  }

  /** Cycle de quota canonique : verrou d'org, contrôle, échange, émargement. */
  #exchangeWithQuota(
    conversation: AiPartSearchConversation,
    message: string,
    user: User
  ): Promise<AiPartSearchConversation> {
    return this.aiTokenQuotaService.withOrgLock(user.organization.id, async () => {
      const currentUsage = await this.aiTokenQuotaService.getUsage(user.organization.id)
      this.aiTokenQuotaService.assertCanUseTokens(user.organization, currentUsage)
      return this.#exchange(conversation, message, user)
    })
  }

  /**
   * Un tour de chat : envoie le fil au modèle, parse et **valide** la réponse,
   * puis persiste messages + état en une fois — une réponse invalide lève
   * avant toute écriture (rien n'est persisté, invariant #602).
   */
  async #exchange(
    conversation: AiPartSearchConversation,
    userMessage: string,
    user: User
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
      // Même rapprochement que la saisie libre (#573) : nom, code plaque ou
      // alias, au sein de la marque du snapshot.
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
      } else if (conversation.context !== null) {
        // Code non rendu ou non rapprochable : échec honnête — l'écran affiche
        // le repli statique vers la navigation manuelle, jamais un texte LLM.
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

    await this.aiTokenQuotaService.recordUsage(user.organization, tokensUsed)

    return conversation
  }

  /**
   * Fil envoyé au modèle : prompt système reconstruit à chaque tour selon la
   * **phase** (jamais stocké), 1er message utilisateur reconstruit avec le
   * contexte moteur, instruction de clôture au dernier tour autorisé.
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

    return buildEngineIdentificationSystemPrompt(locale, {
      brandName: brand?.name ?? context?.brand ?? '',
      serialNumber: context?.serialNumber ?? null,
      referencePattern: brand?.referencePattern ?? null,
      modelLines,
    })
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

    return buildPartSearchSystemPrompt(locale, {
      engineLabel:
        engineLabel || (locale === 'fr' ? 'moteur non identifié' : 'unidentified engine'),
      vocabularyLines,
    })
  }

  /**
   * Vocabulaire fermé servi au modèle : les pièces des ensembles de la famille
   * du moteur (#574) plus les pièces sans référence — exactement ce que la
   * navigation manuelle propose pour ce moteur.
   */
  #vocabularyFor(context: PartSearchContext | null): SparePartCatalogEntry[] {
    const familySlugs = new Set(
      assembliesForEngineFamily(context?.family ?? null).map((assembly) => assembly.slug)
    )

    return [...SPARE_PART_CATALOG_INDEX.values()].filter(
      (entry) => entry.assemblySlug === null || familySlugs.has(entry.assemblySlug)
    )
  }

  async #findOwnedOrFail(
    user: User,
    engine: BoatEngine,
    token: string
  ): Promise<AiPartSearchConversation> {
    const conversation = await AiPartSearchConversation.findBy('token', token)
    if (
      conversation === null ||
      conversation.userId !== user.id ||
      conversation.boatEngineId !== engine.id
    ) {
      throw new PartSearchConversationNotFoundError()
    }
    return conversation
  }

  async #loadOrganization(user: User): Promise<void> {
    if (user.organization === undefined) {
      await user.load('organization')
    }
  }
}
