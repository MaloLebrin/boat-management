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
 * reconstruit à chaque tour, rien n'est perdu). 250k depuis #642 : un tour
 * outillé coûte deux à trois appels — à 100k une conversation était coupée
 * au bout de six à dix questions. Plafond par conversation, sans effet sur le
 * quota mensuel de l'organisation.
 */
export const ASSISTANT_CONVERSATION_TOKEN_BUDGET = 250_000

/** Bornes du contexte flotte injecté dans le prompt système. */
export const ASSISTANT_ROSTER_MAX_BOATS = 40
export const ASSISTANT_DIGEST_MAX_TASKS = 5

export type AssistantStatus = 'active' | 'archived'

/** Cible d'un handoff vers une feature IA existante. */
export type AssistantHandoffTarget = 'diagnosis' | 'part_search'

/**
 * Source d'une réponse `answer` (#642) — rendue par le front comme un badge
 * i18n sous la bulle, jamais comme une phrase du modèle :
 * - `fleet_data` : appuyée sur les données de l'organisation (outils) ;
 * - `product` : explication du produit FleetAi ;
 * - `general` : connaissance nautique générale, signalée comme telle.
 */
export const ASSISTANT_ANSWER_SOURCES = ['fleet_data', 'product', 'general'] as const
export type AssistantAnswerSource = (typeof ASSISTANT_ANSWER_SOURCES)[number]

/**
 * Cibles de navigation proposables par le copilote (#642) — vocabulaire fermé
 * de routes nommées existantes, validé côté serveur puis rendu en `<Link>`.
 * `path` est le chemin réel de la route (`start/routes/`), `i18nKey` le
 * libellé du lien (les deux locales) — jamais de texte du modèle.
 */
export const ASSISTANT_NAV_TARGETS = {
  'dashboard': { path: '/dashboard', i18nKey: 'assistant.navTargets.dashboard' },
  'boats.index': { path: '/boats', i18nKey: 'assistant.navTargets.boats' },
  'engines.index': { path: '/engines', i18nKey: 'assistant.navTargets.engines' },
  'planning.index': { path: '/planning', i18nKey: 'assistant.navTargets.planning' },
  'maintenance.history': {
    path: '/maintenance/history',
    i18nKey: 'assistant.navTargets.maintenanceHistory',
  },
  'ports.index': { path: '/ports', i18nKey: 'assistant.navTargets.ports' },
  'navigation.logbook': {
    path: '/navigation/logbook',
    i18nKey: 'assistant.navTargets.navigationLogbook',
  },
  'navigation.fuel': { path: '/navigation/fuel', i18nKey: 'assistant.navTargets.navigationFuel' },
  'navigation.incidents': {
    path: '/navigation/incidents',
    i18nKey: 'assistant.navTargets.navigationIncidents',
  },
  'reservations.index': { path: '/reservations', i18nKey: 'assistant.navTargets.reservations' },
  'clients.index': { path: '/clients', i18nKey: 'assistant.navTargets.clients' },
  'invoices.index': { path: '/invoices', i18nKey: 'assistant.navTargets.invoices' },
  'crew.index': { path: '/crew', i18nKey: 'assistant.navTargets.crew' },
  'settings.billing': {
    path: '/settings/billing',
    i18nKey: 'assistant.navTargets.settingsBilling',
  },
  'settings.ai': { path: '/settings/ai', i18nKey: 'assistant.navTargets.settingsAi' },
  'settings.members': {
    path: '/settings/members',
    i18nKey: 'assistant.navTargets.settingsMembers',
  },
  'settings.import': { path: '/settings/import', i18nKey: 'assistant.navTargets.settingsImport' },
  'diagnostic.index': { path: '/diagnostic', i18nKey: 'assistant.navTargets.diagnostic' },
  'spareParts.index': { path: '/spare-parts', i18nKey: 'assistant.navTargets.spareParts' },
  'notifications.index': { path: '/notifications', i18nKey: 'assistant.navTargets.notifications' },
} as const satisfies Record<string, { path: string; i18nKey: string }>

export type AssistantNavTarget = keyof typeof ASSISTANT_NAV_TARGETS

export function isAssistantNavTarget(value: unknown): value is AssistantNavTarget {
  return typeof value === 'string' && value in ASSISTANT_NAV_TARGETS
}

export function isAssistantAnswerSource(value: unknown): value is AssistantAnswerSource {
  return (
    typeof value === 'string' && (ASSISTANT_ANSWER_SOURCES as readonly string[]).includes(value)
  )
}

/**
 * Réponse JSON discriminée attendue du modèle à chaque tour :
 * - `answer` : réponse conversationnelle appuyée sur le contexte injecté ;
 * - `propose_task` : proposition de tâche de maintenance — validée contre le
 *   roster puis stockée en `pending_action`, jamais écrite directement ;
 * - `handoff` : orientation vers le diagnostic de panne ou la recherche de
 *   pièces, avec le bateau/moteur résolu conversationnellement.
 */
export type AssistantAiReply =
  | {
      type: 'answer'
      message: string
      source?: AssistantAnswerSource
      navTarget?: AssistantNavTarget
    }
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
  /** #642 — source d'une réponse `answer`, rendue en badge i18n sous la bulle. */
  source?: AssistantAnswerSource
  /** #642 — cible de navigation validée côté serveur, rendue en `<Link>`. */
  navTarget?: AssistantNavTarget
}

/**
 * Consommation IA du mois de l'organisation (#642) — rendue en pied de
 * panneau, avertissement au-delà de 80 %. `limit` null = illimité. Le
 * `tokensUsed` de la conversation, lui, reste privé (règle du transformer).
 */
export interface AssistantAiUsageProps {
  used: number
  limit: number | null
}

/** Seuil (0–1) au-delà duquel le pied de consommation devient un avertissement. */
export const ASSISTANT_AI_USAGE_WARNING_RATIO = 0.8

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
