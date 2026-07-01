import AiAnalysis from '#models/ai_analysis'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

export const AiAnalysisFactory = Factory.define(AiAnalysis, () => ({
  kind: 'fleet_analysis' as const,
  responseText: JSON.stringify([{ text: 'Test suggestion' }]),
  createdAt: DateTime.now(),
  boatId: null,
})).build()
