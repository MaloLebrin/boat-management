import AiAnalysis from '#models/ai_analysis'
import AiService from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import {
  buildBoatUserMessage,
  buildFleetUserMessage,
  buildSystemPrompt,
} from '#services/ai_prompt_service'
import type Organization from '#models/organization'
import type {
  AiSuggestion,
  AiSuggestionLocale,
  BoatSuggestionsInput,
  FleetAnalysisInput,
} from '#shared/types/ai'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class AiAnalysisService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService
  ) {}
  /**
   * Get the latest fleet analysis for a user, in the locale they are browsing in.
   *
   * Le filtre par locale (#460) évite de ressortir une analyse française dans
   * une UI anglaise : les suggestions sont du texte libre généré par le modèle,
   * donc intraduisibles après coup. Sans analyse dans la locale courante le
   * panneau affiche son état vide et propose de relancer la génération.
   */
  async getLatestFleetAnalysis(
    userId: number,
    orgId: number,
    locale: AiSuggestionLocale
  ): Promise<AiAnalysis | null> {
    return AiAnalysis.query()
      .where('userId', userId)
      .where('organizationId', orgId)
      .where('kind', 'fleet_analysis')
      .where('locale', locale)
      .whereNull('boatId')
      .orderBy('createdAt', 'desc')
      .first()
  }

  /**
   * Get the latest boat suggestions for a user and boat, in the locale they are
   * browsing in (cf. `getLatestFleetAnalysis`).
   */
  async getLatestBoatSuggestions(
    userId: number,
    boatId: number,
    orgId: number,
    locale: AiSuggestionLocale
  ): Promise<AiAnalysis | null> {
    return AiAnalysis.query()
      .where('userId', userId)
      .where('organizationId', orgId)
      .where('kind', 'boat_suggestions')
      .where('boatId', boatId)
      .where('locale', locale)
      .orderBy('createdAt', 'desc')
      .first()
  }

  async generateFleetAnalysis(
    userId: number,
    org: Organization,
    input: FleetAnalysisInput,
    locale: AiSuggestionLocale,
    orgSystemPrompt?: string | null,
    orgModelOverride?: string | null
  ): Promise<AiSuggestion[]> {
    return this.aiTokenQuotaService.withOrgLock(org.id, async () => {
      const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
      this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)

      const userMessage = buildFleetUserMessage(input, locale)
      const systemPrompt = buildSystemPrompt(locale)
      const systemContent = orgSystemPrompt ? `${orgSystemPrompt}\n\n${systemPrompt}` : systemPrompt

      const { content: rawResponse, tokensUsed } = await this.aiService.chat(
        [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        orgModelOverride
      )

      await this.aiTokenQuotaService.recordUsage(org, tokensUsed)

      const suggestions = this.#parseResponse(rawResponse)

      await AiAnalysis.create({
        userId,
        organizationId: org.id,
        boatId: null,
        kind: 'fleet_analysis',
        locale,
        responseText: JSON.stringify(suggestions),
        createdAt: DateTime.now(),
      })

      return suggestions
    })
  }

  async generateBoatSuggestions(
    userId: number,
    boatId: number,
    org: Organization,
    input: BoatSuggestionsInput,
    locale: AiSuggestionLocale,
    orgSystemPrompt?: string | null,
    orgModelOverride?: string | null
  ): Promise<AiSuggestion[]> {
    return this.aiTokenQuotaService.withOrgLock(org.id, async () => {
      const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
      this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)

      const userMessage = buildBoatUserMessage(input, locale)
      const systemPrompt = buildSystemPrompt(locale)
      const systemContent = orgSystemPrompt ? `${orgSystemPrompt}\n\n${systemPrompt}` : systemPrompt

      const { content: rawResponse, tokensUsed } = await this.aiService.chat(
        [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        orgModelOverride
      )

      await this.aiTokenQuotaService.recordUsage(org, tokensUsed)

      const suggestions = this.#parseResponse(rawResponse)

      await AiAnalysis.create({
        userId,
        organizationId: org.id,
        boatId,
        kind: 'boat_suggestions',
        locale,
        responseText: JSON.stringify(suggestions),
        createdAt: DateTime.now(),
      })

      return suggestions
    })
  }

  #parseResponse(raw: string): AiSuggestion[] {
    try {
      const match = raw.match(/\[[\s\S]*\]/)
      const jsonStr = match ? match[0] : raw.trim()
      const parsed: unknown = JSON.parse(jsonStr)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item): item is AiSuggestion =>
          typeof item === 'object' && item !== null && typeof item.text === 'string'
      )
    } catch {
      return []
    }
  }
}
