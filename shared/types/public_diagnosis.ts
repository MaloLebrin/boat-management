import type { AiChatMessage } from '#shared/types/ai'

/**
 * Chat IA public de diagnostic de panne moteur (#602) — tunnel d'acquisition.
 *
 * Le visiteur (anonyme ou plan `starter`) dispose d'un nombre limité de
 * conversations gratuites ; les plans `pro`/`enterprise` passent par les
 * quotas de tokens IA existants sans plafond de conversations.
 */

/** Conversations gratuites « à vie » pour un visiteur anonyme ou un plan starter. */
export const PUBLIC_DIAGNOSIS_LIFETIME_LIMIT = 2

/**
 * Nombre max de messages utilisateur par conversation. Au dernier message
 * autorisé, le service force le modèle à rendre son diagnostic final.
 */
export const PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES = 10

/** Longueur max d'un message — alignée sur `aiChatValidator` (#516). */
export const PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH = 4000

/**
 * Clé de session listant les tokens des conversations démarrées par un
 * visiteur anonyme : compteur de quota ET preuve de propriété (seule la
 * session qui a créé une conversation peut y poster).
 */
export const PUBLIC_DIAGNOSIS_SESSION_KEY = 'publicDiagnosisTokens'

export type PublicDiagnosisStatus = 'active' | 'completed'

/** Contexte moteur saisi librement au 1er message — aucune entité en base. */
export interface PublicDiagnosisContext {
  engineType: string | null
  brand: string | null
  hours: number | null
}

/** Diagnostic final structuré — comme `EngineDiagnosisResult`, sans fiche : les fiches `/diagnostic/*` restent authentifiées. */
export interface PublicDiagnosisResult {
  summary: string
  causes: string[]
  nextStep: string
}

/** Réponse JSON discriminée attendue du modèle à chaque tour. */
export type PublicDiagnosisAiReply =
  | { type: 'question'; message: string }
  | { type: 'diagnosis'; result: PublicDiagnosisResult }

export interface PublicDiagnosisStartInput {
  message: string
  engineType: string | null
  brand: string | null
  hours: number | null
}

/** Conversation envoyée à la page marketing. */
export interface PublicDiagnosisConversationProps {
  token: string
  status: PublicDiagnosisStatus
  messages: AiChatMessage[]
  result: PublicDiagnosisResult | null
}

/** Quota affiché : `limit` null = pas de plafond de conversations (pro/enterprise). */
export interface PublicDiagnosisQuotaProps {
  used: number
  limit: number | null
}
