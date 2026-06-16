export const AI_MODEL_OVERRIDES = [
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
] as const
export type AiModelOverride = (typeof AI_MODEL_OVERRIDES)[number]

export type AiAnalysisStatus = 'pending' | 'running' | 'done' | 'failed'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiAnalysisResult {
  id: number
  kind: string
  responseText: string
  createdAt: string
  status: AiAnalysisStatus
}
