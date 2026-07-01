import AiAnalysis from '#models/ai_analysis'
import AiService from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import type Organization from '#models/organization'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export type AiSuggestion = { text: string }

export type FleetAnalysisInput = {
  boats: Array<{
    name: string
    propulsionType: string | null
    enginesCount: number
    sailsCount: number
    hasRig: boolean
  }>
  urgentMaintenance: Array<{
    boatName: string
    title: string
    kind: 'date' | 'hours'
    dueAt: string | null
    dueEngineHours: number | null
    currentEngineHours: number | null
  }>
  stats: {
    boats: number
    engines: number
    sails: number
    rigs: number
    urgentMaintenance: number
  }
}

export type BoatSuggestionsInput = {
  boat: {
    id: number
    name: string
    type: string | null
    propulsionType: string | null
    yearBuilt: number | null
    manufacturer: string | null
    model: string | null
    homePort: string | null
    navigationCategory: string | null
    engines: Array<{
      kind: string
      fuel: string | null
      hours: number | null
      brand: string | null
      model: string | null
    }>
    sails: Array<{
      sailType: string
      manufacturedAt: string | null
      status: string
    }>
    rig: { rigType: string; status: string } | null
    safetyEquipment: Array<{
      equipmentType: string
      expiryDate: string | null
      status: string
    }>
  }
  maintenanceTasks: Array<{
    title: string
    subject: string
    dueAt: string | null
    status: string
  }>
  maintenanceEvents: Array<{
    title: string
    subject: string
    performedAt: string
  }>
}

const SYSTEM_PROMPT = `Tu es un expert en maintenance marine pour une application de gestion de flotte.
Réponds UNIQUEMENT avec un tableau JSON valide d'objets. Chaque objet a une seule clé "text" contenant une suggestion courte et concrète en français (maximum 120 caractères).
Retourne entre 2 et 5 suggestions. N'inclus aucun texte en dehors du tableau JSON.
Exemple: [{"text":"Vérifier l'antifouling — dernière application il y a 13 mois"},{"text":"Vidange moteur à planifier — 490h atteintes"}]`

@inject()
export default class AiAnalysisService {
  constructor(
    private aiService: AiService,
    private aiTokenQuotaService: AiTokenQuotaService
  ) {}
  /**
   * Get the latest fleet analysis for a user
   */
  async getLatestFleetAnalysis(userId: number, orgId: number): Promise<AiAnalysis | null> {
    return AiAnalysis.query()
      .where('userId', userId)
      .where('organizationId', orgId)
      .where('kind', 'fleet_analysis')
      .whereNull('boatId')
      .orderBy('createdAt', 'desc')
      .first()
  }

  /**
   * Get the latest boat suggestions for a user and boat
   */
  async getLatestBoatSuggestions(
    userId: number,
    boatId: number,
    orgId: number
  ): Promise<AiAnalysis | null> {
    return AiAnalysis.query()
      .where('userId', userId)
      .where('organizationId', orgId)
      .where('kind', 'boat_suggestions')
      .where('boatId', boatId)
      .orderBy('createdAt', 'desc')
      .first()
  }

  async generateFleetAnalysis(
    userId: number,
    org: Organization,
    input: FleetAnalysisInput,
    orgSystemPrompt?: string | null,
    orgModelOverride?: string | null
  ): Promise<AiSuggestion[]> {
    const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
    this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)

    const userMessage = this.#buildFleetUserMessage(input)
    const systemContent = orgSystemPrompt ? `${orgSystemPrompt}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT

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
      responseText: JSON.stringify(suggestions),
      createdAt: DateTime.now(),
    })

    return suggestions
  }

  async generateBoatSuggestions(
    userId: number,
    boatId: number,
    org: Organization,
    input: BoatSuggestionsInput,
    orgSystemPrompt?: string | null,
    orgModelOverride?: string | null
  ): Promise<AiSuggestion[]> {
    const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
    this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)

    const userMessage = this.#buildBoatUserMessage(input)
    const systemContent = orgSystemPrompt ? `${orgSystemPrompt}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT

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
      responseText: JSON.stringify(suggestions),
      createdAt: DateTime.now(),
    })

    return suggestions
  }

  #buildFleetUserMessage(input: FleetAnalysisInput): string {
    const { boats, urgentMaintenance, stats } = input

    const boatsList = boats
      .map(
        (b) =>
          `- ${b.name} (${b.propulsionType ?? 'type inconnu'}) : ${b.enginesCount} moteur(s), ${b.sailsCount} voile(s)${b.hasRig ? ', gréement' : ''}`
      )
      .join('\n')

    let urgentList = 'Aucune'
    if (urgentMaintenance.length > 0) {
      urgentList = urgentMaintenance
        .map((m) => {
          if (m.kind === 'date') {
            return `- ${m.boatName} : ${m.title} — date d'échéance ${m.dueAt}`
          }
          return `- ${m.boatName} : ${m.title} — ${m.currentEngineHours}h actuelles / ${m.dueEngineHours}h requises`
        })
        .join('\n')
    }

    return `Analyse cette flotte de bateaux et génère des suggestions de maintenance prioritaires :

Statistiques : ${stats.boats} bateau(x), ${stats.engines} moteur(s), ${stats.sails} voile(s), ${stats.rigs} gréement(s)
Maintenances urgentes : ${stats.urgentMaintenance}

Bateaux :
${boatsList}

Maintenances urgentes :
${urgentList}`
  }

  #buildBoatUserMessage(input: BoatSuggestionsInput): string {
    const { boat, maintenanceTasks, maintenanceEvents } = input

    const enginesList =
      boat.engines.length > 0
        ? boat.engines
            .map(
              (e) =>
                `- ${e.kind} ${e.brand ?? ''} ${e.model ?? ''} (${e.fuel ?? 'carburant inconnu'}, ${e.hours ?? '?'}h)`
            )
            .join('\n')
        : 'Aucun'

    const sailsList =
      boat.sails.length > 0
        ? boat.sails.map((s) => `- ${s.sailType} (${s.status})`).join('\n')
        : 'Aucune'

    const rigInfo = boat.rig ? `${boat.rig.rigType} (${boat.rig.status})` : 'Aucun'

    const safetyList =
      boat.safetyEquipment.length > 0
        ? boat.safetyEquipment
            .map(
              (eq) =>
                `- ${eq.equipmentType} (${eq.status})${eq.expiryDate ? ` — expire ${eq.expiryDate}` : ''}`
            )
            .join('\n')
        : 'Aucun'

    const openTasks = maintenanceTasks.filter((t) => t.status === 'open')
    const tasksWithDueAt = openTasks.filter((t) => t.dueAt !== null)

    const recentEvents = maintenanceEvents.slice(0, 5)
    const eventsList =
      recentEvents.length > 0
        ? recentEvents.map((ev) => `- ${ev.performedAt} : ${ev.title}`).join('\n')
        : 'Aucune'

    return `Analyse ce bateau et génère des suggestions de maintenance spécifiques :

Bateau : ${boat.name} (${boat.manufacturer ?? ''} ${boat.model ?? ''}, ${boat.yearBuilt ?? 'année inconnue'})
Type : ${boat.type ?? 'inconnu'}, Propulsion : ${boat.propulsionType ?? 'inconnue'}
Port d'attache : ${boat.homePort ?? 'inconnu'}, Catégorie : ${boat.navigationCategory ?? 'inconnue'}

Moteurs :
${enginesList}

Voiles :
${sailsList}

Gréement : ${rigInfo}

Équipements sécurité :
${safetyList}

Tâches ouvertes : ${openTasks.length} dont ${tasksWithDueAt.length} avec date d'échéance

Dernières maintenances (5 max) :
${eventsList}`
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
