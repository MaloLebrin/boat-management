import AiAnalysis from '#models/ai_analysis'
import AiService from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import {
  buildBoatUserMessage,
  buildFleetUserMessage,
  buildSystemPrompt,
} from '#services/ai_prompt_service'
import {
  buildEngineDiagnosisSystemPrompt,
  buildEngineDiagnosisUserMessage,
  parseEngineDiagnosisResponse,
} from '#services/engine_diagnosis_prompt_service'
import type Organization from '#models/organization'
import type {
  AiSuggestion,
  AiSuggestionLocale,
  BoatSuggestionsInput,
  EngineDiagnosisInput,
  EngineDiagnosisPanelData,
  EngineDiagnosisResult,
  FleetAnalysisInput,
} from '#shared/types/ai'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { isEngineFamily } from '#shared/types/engine_catalog'

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

  /**
   * Dernier diagnostic moteur (#516) prêt pour le panneau de la page
   * checklist : résultat structuré + horodatage, ou `null` sans analyse dans
   * la locale courante (cf. `getLatestFleetAnalysis` pour le filtre locale).
   * Une ligne au JSON illisible est ignorée plutôt que de casser la page.
   */
  async getLatestEngineDiagnosis(
    userId: number,
    engineId: number,
    orgId: number,
    locale: AiSuggestionLocale
  ): Promise<EngineDiagnosisPanelData | null> {
    const analysis = await AiAnalysis.query()
      .where('userId', userId)
      .where('organizationId', orgId)
      .where('kind', 'engine_diagnosis')
      .where('boatEngineId', engineId)
      .where('locale', locale)
      .orderBy('createdAt', 'desc')
      .first()
    if (!analysis) return null

    try {
      return {
        result: JSON.parse(analysis.responseText) as EngineDiagnosisResult,
        createdAt: analysis.createdAt.toISO()!,
      }
    } catch {
      return null
    }
  }

  /**
   * Diagnostic de panne moteur (#516). Contrairement aux suggestions, une
   * réponse Mistral invalide lève `AiInvalidResponseError` (propagée au
   * contrôleur) et rien n'est persisté.
   */
  async generateEngineDiagnosis(
    userId: number,
    boatId: number,
    engineId: number,
    org: Organization,
    input: EngineDiagnosisInput,
    locale: AiSuggestionLocale,
    orgSystemPrompt?: string | null,
    orgModelOverride?: string | null
  ): Promise<EngineDiagnosisResult> {
    return this.aiTokenQuotaService.withOrgLock(org.id, async () => {
      const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
      this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)

      // La famille du moteur cadre le prompt et restreint les fiches
      // recommandables (#576) : un diesel ne doit pas être diagnostiqué en 2T.
      const family = isEngineFamily(input.engine.family) ? input.engine.family : null

      const userMessage = buildEngineDiagnosisUserMessage(input, locale)
      const systemPrompt = buildEngineDiagnosisSystemPrompt(locale, family)
      const systemContent = orgSystemPrompt ? `${orgSystemPrompt}\n\n${systemPrompt}` : systemPrompt

      const { content: rawResponse, tokensUsed } = await this.aiService.chat(
        [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        orgModelOverride
      )

      await this.aiTokenQuotaService.recordUsage(org, tokensUsed)

      const result = parseEngineDiagnosisResponse(rawResponse, family)

      await AiAnalysis.create({
        userId,
        organizationId: org.id,
        boatId,
        boatEngineId: engineId,
        kind: 'engine_diagnosis',
        locale,
        responseText: JSON.stringify(result),
        createdAt: DateTime.now(),
      })

      return result
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
