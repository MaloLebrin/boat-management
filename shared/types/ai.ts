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
