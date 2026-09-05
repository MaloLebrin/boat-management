import type { MaintenanceTaskSubject } from '#shared/types/maintenance'

/**
 * Copilote FleetAi — chat contextuel global de l'app.
 *
 * Le modèle répond à chaque tour par UN objet JSON discriminé
 * (`AssistantAiReply`), parsé et validé côté serveur AVANT toute écriture
 * (invariant #602/#634). Il ne déclenche jamais d'action lui-même : une
 * proposition de tâche est stockée dans `pending_action` et n'est exécutée
 * qu'après confirmation explicite de l'utilisateur, depuis les données
 * stockées côté serveur — jamais depuis un payload client.
 */

/** Nombre max de messages utilisateur par conversation. */
export const ASSISTANT_MAX_USER_MESSAGES = 20

/** Longueur max d'un message — alignée sur les autres chats IA (#602, #634). */
export const ASSISTANT_MESSAGE_MAX_LENGTH = 4000

/**
 * Fenêtre d'historique rejouée au modèle : le fil complet reste stocké et
 * affiché, mais seuls les derniers messages partent dans le prompt — on ne
 * paie pas toute la conversation à chaque tour.
 */
export const ASSISTANT_HISTORY_WINDOW = 12

/**
 * Plafond de tokens par conversation : au-delà, l'utilisateur est invité à
 * démarrer une nouvelle conversation (le contexte est de toute façon
 * reconstruit à chaque tour, rien n'est perdu).
 */
export const ASSISTANT_CONVERSATION_TOKEN_BUDGET = 100_000

/** Bornes du contexte flotte injecté dans le prompt système. */
export const ASSISTANT_ROSTER_MAX_BOATS = 40
export const ASSISTANT_DIGEST_MAX_TASKS = 5

export type AssistantStatus = 'active' | 'archived'

/** Cible d'un handoff vers une feature IA existante. */
export type AssistantHandoffTarget = 'diagnosis' | 'part_search'

/**
 * Réponse JSON discriminée attendue du modèle à chaque tour :
 * - `answer` : réponse conversationnelle appuyée sur le contexte injecté ;
 * - `propose_task` : proposition de tâche de maintenance — validée contre le
 *   roster puis stockée en `pending_action`, jamais écrite directement ;
 * - `handoff` : orientation vers le diagnostic de panne ou la recherche de
 *   pièces, avec le bateau/moteur résolu conversationnellement.
 */
export type AssistantAiReply =
  | { type: 'answer'; message: string }
  | {
      type: 'propose_task'
      message: string
      task: {
        boatId: number
        subject: MaintenanceTaskSubject
        title: string
        notes: string | null
        boatEngineId: number | null
        dueAt: string | null
        dueEngineHours: number | null
        recurrenceIntervalMonths: number | null
        recurrenceIntervalEngineHours: number | null
      }
    }
  | {
      type: 'handoff'
      message: string
      target: AssistantHandoffTarget
      boatId: number
      engineId: number
    }

/**
 * Proposition de tâche validée, stockée dans `pending_action`.
 * `boatName`/`engineLabel` sont dénormalisés pour l'affichage de la carte de
 * confirmation — la validation a déjà prouvé leur appartenance à l'org.
 */
export interface AssistantTaskProposal {
  boatId: number
  boatName: string
  engineLabel: string | null
  subject: MaintenanceTaskSubject
  title: string
  notes: string | null
  boatEngineId: number | null
  dueAt: string | null
  dueEngineHours: number | null
  recurrenceIntervalMonths: number | null
  recurrenceIntervalEngineHours: number | null
}

/**
 * Cartes structurées attachées à un message assistant : leur texte est rendu
 * côté client via i18n — jamais généré par le LLM.
 */
export type AssistantMessageCard =
  | {
      kind: 'task_created'
      taskId: number
      boatName: string
      title: string
      dueAt: string | null
      dueEngineHours: number | null
    }
  | { kind: 'task_dismissed' }
  | {
      kind: 'handoff'
      target: AssistantHandoffTarget
      boatId: number
      engineId: number
      boatName: string
      engineLabel: string
    }

/** Message du fil — `card` porte les blocs structurés (créations, handoffs). */
export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  card?: AssistantMessageCard
}

/** Conversation envoyée au panneau (prop partagée `assistantConversation`). */
export interface AssistantConversationProps {
  token: string
  status: AssistantStatus
  messages: AssistantMessage[]
  pendingAction: AssistantTaskProposal | null
  userMessagesCount: number
}

/** Roster flotte servi au prompt ET à la validation des ids rendus par le modèle. */
export interface AssistantFleetRosterEngine {
  id: number
  label: string
}

export interface AssistantFleetRosterBoat {
  id: number
  name: string
  engines: AssistantFleetRosterEngine[]
}

export interface AssistantFleetRoster {
  boats: AssistantFleetRosterBoat[]
  truncated: boolean
}
