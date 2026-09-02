import type { AiChatMessage } from '#shared/types/ai'
import type { EngineFamily } from '#shared/types/engine_catalog'
import type { SparePartReferenceRow } from '#shared/types/spare_parts'

/**
 * Chat IA de recherche de références de pièces par numéro de série (#634).
 *
 * Deux entrées partagent ces types : le chat de l'app connectée (réservé aux
 * plans avec IA, quota de tokens mensuel, aucun comptage de session) et le
 * chat public marketing (Phase 2), qui reprend les limites à vie du diagnostic
 * public (#602) — comptage en session pour les anonymes, en base pour les
 * plans sans IA.
 *
 * Le LLM sert à comprendre l'utilisateur et à interpréter le numéro de série,
 * **jamais à produire une référence** : toute référence affichée provient de
 * `engine_part_references` avec sa source (anti-hallucination).
 */

/**
 * Nombre max de messages utilisateur par conversation. Au dernier message
 * autorisé, le service force le modèle à rendre une réponse décisive.
 */
export const PART_SEARCH_MAX_USER_MESSAGES = 10

/** Longueur max d'un message — alignée sur le chat public (#602). */
export const PART_SEARCH_MESSAGE_MAX_LENGTH = 4000

/**
 * Conversations gratuites « à vie » du chat public (Phase 2) — même valeur et
 * même mécanique que `PUBLIC_DIAGNOSIS_LIFETIME_LIMIT` (#602) : la liste de
 * tokens en session compte les conversations des anonymes et prouve leur
 * propriété ; les plans sans IA sont comptés en base sur l'organisation.
 */
export const PUBLIC_PART_SEARCH_LIFETIME_LIMIT = 2

/** Clé de session des tokens de conversations publiques anonymes. */
export const PUBLIC_PART_SEARCH_SESSION_KEY = 'publicPartSearchTokens'

/**
 * Ton des prompts : l'app connectée vouvoie, le marketing tutoie — même
 * contrat JSON, seule la consigne de rédaction change.
 */
export type SparePartChatTone = 'formal' | 'informal'

/**
 * Phase de la conversation, pilotée par le backend :
 * - `engine` : identification du modèle moteur (numéro de série / code plaque) ;
 * - `part` : choix de la pièce dans le vocabulaire fermé du catalogue.
 *
 * Un moteur dont le modèle est déjà résolu par le catalogue démarre
 * directement en phase `part` — aucun token dépensé pour l'identification.
 */
export type PartSearchPhase = 'engine' | 'part'

export type PartSearchStatus = 'active' | 'completed'

/**
 * Snapshot du moteur pris à la création de la conversation : les prompts
 * restent stables si le moteur est édité en cours de route.
 */
export interface PartSearchContext {
  brand: string | null
  model: string | null
  serialNumber: string | null
  /** Slug de la marque du catalogue (#573), résolu côté serveur. */
  catalogBrandSlug: string | null
  /** Famille de motorisation résolue (#574) — décide du vocabulaire de pièces. */
  family: EngineFamily | null
  /**
   * L'identification du modèle a échoué (marque hors catalogue, ou le modèle
   * n'a pas pu être départagé) : l'écran affiche le repli honnête vers la
   * navigation manuelle — le message n'est jamais délégué au LLM.
   */
  identificationFailed: boolean
}

/**
 * Réponse JSON discriminée attendue du modèle à chaque tour. Le `type` doit
 * correspondre à la phase courante : `engine` en phase d'identification,
 * `part` en phase de choix de pièce, `question` dans les deux.
 */
export type SparePartChatAiReply =
  | { type: 'question'; message: string }
  | { type: 'engine'; modelCode: string | null; message: string }
  | { type: 'part'; partKey: string | null; message: string }

/**
 * Résultat final : la pièce retenue et sa référence **issue de la base**.
 * `partKey: null` = aucune pièce du catalogue ne correspond à la demande ;
 * `reference: null` = pièce identifiée mais référence inconnue du corpus —
 * l'écran retombe alors sur les liens revendeurs (#517).
 */
export interface PartSearchResult {
  partKey: string | null
  reference: SparePartReferenceRow | null
}

/** Conversation envoyée à la page chat. */
export interface PartSearchConversationProps {
  token: string
  status: PartSearchStatus
  phase: PartSearchPhase
  messages: AiChatMessage[]
  result: PartSearchResult | null
  identificationFailed: boolean
}

/** Formulaire de démarrage du chat public : tout est en saisie libre. */
export interface PublicPartSearchStartInput {
  message: string
  brand: string | null
  serialNumber: string | null
}

/** Quota affiché sur la page publique — `limit: null` = illimité (plan IA). */
export interface PublicPartSearchQuotaProps {
  used: number
  limit: number | null
}

/**
 * Conversation de la page publique : les props connectées plus le snapshot
 * moteur qui alimente les liens revendeurs (#517) — jamais le numéro de série.
 */
export interface PublicPartSearchConversationProps extends PartSearchConversationProps {
  engine: {
    brand: string | null
    model: string | null
    catalogBrandSlug: string | null
  }
}
