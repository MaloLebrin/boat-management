import type { EngineFuel } from '#shared/constants/boats/boat_form_options'
import type { AssistantToolPlanFlag } from '#shared/types/assistant_tools'
import type { AuditAction } from '#shared/types/audit_log'
import type { IncidentType } from '#shared/types/incident'
import type { MaintenanceTaskSubject } from '#shared/types/maintenance'
import type { Capability } from '#shared/types/permissions'
import type { ReservationType } from '#shared/types/reservation'

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
 * Longueur max de l'URL de page envoyée avec un message (contexte de page).
 * Purement indicative pour le prompt — jamais stockée.
 */
export const ASSISTANT_PAGE_URL_MAX_LENGTH = 300

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
 * `promptLabel` est le libellé SERVEUR de la page, injecté dans le prompt
 * système quand l'utilisateur écrit depuis cette page (contexte de page).
 */
export const ASSISTANT_NAV_TARGETS = {
  'dashboard': {
    path: '/dashboard',
    i18nKey: 'assistant.navTargets.dashboard',
    promptLabel: { fr: 'Tableau de bord', en: 'Dashboard' },
  },
  'boats.index': {
    path: '/boats',
    i18nKey: 'assistant.navTargets.boats',
    promptLabel: { fr: 'Liste des bateaux', en: 'Boat list' },
  },
  'engines.index': {
    path: '/engines',
    i18nKey: 'assistant.navTargets.engines',
    promptLabel: { fr: 'Liste des moteurs', en: 'Engine list' },
  },
  'planning.index': {
    path: '/planning',
    i18nKey: 'assistant.navTargets.planning',
    promptLabel: { fr: 'Planning de maintenance', en: 'Maintenance planning' },
  },
  'maintenance.history': {
    path: '/maintenance/history',
    i18nKey: 'assistant.navTargets.maintenanceHistory',
    promptLabel: { fr: 'Historique de maintenance', en: 'Maintenance history' },
  },
  'ports.index': {
    path: '/ports',
    i18nKey: 'assistant.navTargets.ports',
    promptLabel: { fr: 'Ports', en: 'Ports' },
  },
  'navigation.logbook': {
    path: '/navigation/logbook',
    i18nKey: 'assistant.navTargets.navigationLogbook',
    promptLabel: { fr: 'Journal de bord', en: 'Logbook' },
  },
  'navigation.fuel': {
    path: '/navigation/fuel',
    i18nKey: 'assistant.navTargets.navigationFuel',
    promptLabel: { fr: 'Suivi carburant', en: 'Fuel tracking' },
  },
  'navigation.incidents': {
    path: '/navigation/incidents',
    i18nKey: 'assistant.navTargets.navigationIncidents',
    promptLabel: { fr: 'Incidents', en: 'Incidents' },
  },
  'reservations.index': {
    path: '/reservations',
    i18nKey: 'assistant.navTargets.reservations',
    promptLabel: { fr: 'Calendrier des réservations', en: 'Reservation calendar' },
  },
  'clients.index': {
    path: '/clients',
    i18nKey: 'assistant.navTargets.clients',
    promptLabel: { fr: 'Clients', en: 'Clients' },
  },
  'invoices.index': {
    path: '/invoices',
    i18nKey: 'assistant.navTargets.invoices',
    promptLabel: { fr: 'Factures et devis', en: 'Invoices and quotes' },
  },
  'crew.index': {
    path: '/crew',
    i18nKey: 'assistant.navTargets.crew',
    promptLabel: { fr: 'Équipage', en: 'Crew' },
  },
  'settings.billing': {
    path: '/settings/billing',
    i18nKey: 'assistant.navTargets.settingsBilling',
    promptLabel: { fr: 'Réglages — abonnement et facturation', en: 'Settings — plan and billing' },
  },
  'settings.ai': {
    path: '/settings/ai',
    i18nKey: 'assistant.navTargets.settingsAi',
    promptLabel: { fr: 'Réglages — IA', en: 'Settings — AI' },
  },
  'settings.members': {
    path: '/settings/members',
    i18nKey: 'assistant.navTargets.settingsMembers',
    promptLabel: { fr: 'Réglages — membres', en: 'Settings — members' },
  },
  'settings.import': {
    path: '/settings/import',
    i18nKey: 'assistant.navTargets.settingsImport',
    promptLabel: { fr: 'Réglages — import CSV', en: 'Settings — CSV import' },
  },
  'diagnostic.index': {
    path: '/diagnostic',
    i18nKey: 'assistant.navTargets.diagnostic',
    promptLabel: { fr: 'Diagnostic de panne moteur', en: 'Engine fault diagnosis' },
  },
  'spareParts.index': {
    path: '/spare-parts',
    i18nKey: 'assistant.navTargets.spareParts',
    promptLabel: { fr: 'Recherche de pièces détachées', en: 'Spare part search' },
  },
  'notifications.index': {
    path: '/notifications',
    i18nKey: 'assistant.navTargets.notifications',
    promptLabel: { fr: 'Notifications', en: 'Notifications' },
  },
} as const satisfies Record<
  string,
  { path: string; i18nKey: string; promptLabel: { fr: string; en: string } }
>

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
 * Vocabulaire fermé des actions proposables par le copilote (agent
 * actionnable). Le modèle ne fait que des PROPOSITIONS : chaque action est
 * validée côté serveur, stockée en `pending_action`, puis exécutée uniquement
 * à la confirmation explicite de l'utilisateur — jamais d'écriture directe.
 */
export const ASSISTANT_ACTION_KINDS = [
  'create_task',
  'add_engine_hours',
  'start_trip',
  'close_trip',
  'log_fuel',
  'report_incident',
  'create_reservation',
  'create_client',
  'set_part_stock',
] as const

export type AssistantActionKind = (typeof ASSISTANT_ACTION_KINDS)[number]

/**
 * Gardes par action — source unique consommée par le prompt (kinds offerts),
 * la validation de proposition, le contrôleur de confirmation ET le front
 * (masquage du bouton Confirmer). `planFlag` est re-vérifié à l'exécution sur
 * les quotas EFFECTIFS (tier + modules + add-ons) : le plan peut changer entre
 * la proposition et la confirmation.
 */
export const ASSISTANT_ACTION_META: Record<
  AssistantActionKind,
  { capability: Capability; planFlag?: AssistantToolPlanFlag }
> = {
  create_task: { capability: 'maintenance.create' },
  add_engine_hours: { capability: 'boats.edit' },
  start_trip: { capability: 'navigation_logs.create' },
  close_trip: { capability: 'navigation_logs.update' },
  log_fuel: { capability: 'fuel_logs.create' },
  report_incident: { capability: 'incidents.create' },
  create_reservation: { capability: 'boats.manage', planFlag: 'canManageReservations' },
  create_client: { capability: 'clients.create', planFlag: 'canManageClients' },
  set_part_stock: { capability: 'boats.edit' },
}

export function isAssistantActionKind(value: unknown): value is AssistantActionKind {
  return typeof value === 'string' && (ASSISTANT_ACTION_KINDS as readonly string[]).includes(value)
}

/**
 * Action telle que rendue par le modèle (ids bruts, aucune dénormalisation) —
 * la forme `propose_action` du contrat. La validation serveur la transforme en
 * `AssistantPendingAction` (ids prouvés org + champs d'affichage).
 */
export type AssistantProposedAction =
  | {
      kind: 'create_task'
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
  | { kind: 'add_engine_hours'; boatId: number; engineId: number; incrementBy: number }
  | {
      kind: 'start_trip'
      boatId: number
      departedAt: string
      departurePortName: string | null
      engineHoursStart: number | null
      crewCount: number | null
      notes: string | null
    }
  | {
      kind: 'close_trip'
      boatId: number
      arrivedAt: string
      arrivalPortName: string | null
      distanceNm: number | null
      engineHoursEnd: number | null
      boatEngineId: number | null
      fuelConsumedLiters: number | null
      notes: string | null
    }
  | {
      kind: 'log_fuel'
      boatId: number
      fueledAt: string
      quantityLiters: number
      pricePerLiter: number | null
      totalCost: number | null
      boatEngineId: number | null
      fuelType: EngineFuel | null
      supplier: string | null
      notes: string | null
    }
  | {
      kind: 'report_incident'
      boatId: number
      occurredAt: string
      incidentType: IncidentType
      location: string | null
      description: string
    }
  | {
      kind: 'create_reservation'
      boatId: number
      startsAt: string
      endsAt: string
      clientId: number | null
      clientName: string
      clientEmail: string | null
      clientPhone: string | null
      reservationType: ReservationType | null
      notes: string | null
    }
  | {
      kind: 'create_client'
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      notes: string | null
    }
  | { kind: 'set_part_stock'; boatId: number; engineId: number; partId: number; newStock: number }

/**
 * Réponse JSON discriminée attendue du modèle à chaque tour :
 * - `answer` : réponse conversationnelle appuyée sur le contexte injecté ;
 * - `propose_action` : proposition d'action (vocabulaire fermé `kind`) —
 *   validée côté serveur puis stockée en `pending_action`, jamais écrite
 *   directement. L'ancienne forme `propose_task` reste acceptée au parse
 *   comme alias de `propose_action` + `kind: 'create_task'` ;
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
      type: 'propose_action'
      message: string
      action: AssistantProposedAction
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
 * Actions validées stockées dans `pending_action` — une interface par `kind`,
 * ids prouvés org + dénormalisations d'affichage (`boatName`, `engineLabel`…)
 * pour la carte de confirmation. Les blobs antérieurs à l'agent actionnable
 * n'ont pas de champ `kind` : le modèle Lucid les enveloppe en `create_task`
 * à la lecture (aucune migration).
 */
export interface AssistantTaskAction extends AssistantTaskProposal {
  kind: 'create_task'
}

export interface AssistantEngineHoursAction {
  kind: 'add_engine_hours'
  boatId: number
  boatName: string
  engineId: number
  engineLabel: string
  /** Incrément (jamais une valeur absolue) — arrondi à l'entier par le service. */
  incrementBy: number
  currentHours: number | null
}

export interface AssistantStartTripAction {
  kind: 'start_trip'
  boatId: number
  boatName: string
  departedAt: string
  departurePortName: string | null
  engineHoursStart: number | null
  crewCount: number | null
  notes: string | null
}

export interface AssistantCloseTripAction {
  kind: 'close_trip'
  boatId: number
  boatName: string
  /** Sortie `in_progress` résolue à la validation — re-résolue au confirm. */
  logId: number
  departedAt: string
  arrivedAt: string
  arrivalPortName: string | null
  distanceNm: number | null
  engineHoursEnd: number | null
  boatEngineId: number | null
  engineLabel: string | null
  fuelConsumedLiters: number | null
  notes: string | null
}

export interface AssistantFuelLogAction {
  kind: 'log_fuel'
  boatId: number
  boatName: string
  fueledAt: string
  quantityLiters: number
  pricePerLiter: number | null
  totalCost: number | null
  boatEngineId: number | null
  engineLabel: string | null
  fuelType: EngineFuel | null
  supplier: string | null
  notes: string | null
}

export interface AssistantIncidentAction {
  kind: 'report_incident'
  boatId: number
  boatName: string
  occurredAt: string
  incidentType: IncidentType
  location: string | null
  description: string
}

export interface AssistantReservationAction {
  kind: 'create_reservation'
  boatId: number
  boatName: string
  startsAt: string
  endsAt: string
  /** Client existant validé org — sinon null (client libre `clientName`). */
  clientId: number | null
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  reservationType: ReservationType | null
  notes: string | null
}

export interface AssistantClientAction {
  kind: 'create_client'
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  notes: string | null
}

export interface AssistantPartStockAction {
  kind: 'set_part_stock'
  boatId: number
  boatName: string
  engineId: number
  engineLabel: string
  partId: number
  designation: string
  reference: string | null
  /** Stock au moment de la proposition — la carte affiche `old → new`. */
  oldStock: number | null
  newStock: number
}

export type AssistantPendingAction =
  | AssistantTaskAction
  | AssistantEngineHoursAction
  | AssistantStartTripAction
  | AssistantCloseTripAction
  | AssistantFuelLogAction
  | AssistantIncidentAction
  | AssistantReservationAction
  | AssistantClientAction
  | AssistantPartStockAction

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
  /**
   * Action confirmée et exécutée (agent actionnable) — le libellé de la carte
   * vient de `assistant.actionDone.<actionKind>` (i18n), `label`/`boatName`
   * sont des valeurs factuelles de la proposition, jamais une phrase du modèle.
   */
  | {
      kind: 'action_done'
      actionKind: AssistantActionKind
      boatName: string | null
      label: string | null
      entityId: number | null
    }
  | { kind: 'action_dismissed'; actionKind: AssistantActionKind }

/**
 * Résultat de l'exécution d'une action confirmée — consommé par le contrôleur
 * (journal d'audit + flash). La carte est déjà apposée à la conversation.
 */
export interface AssistantActionOutcome {
  /** `action_done` — sauf `create_task` qui garde la carte riche `task_created`. */
  card: AssistantMessageCard
  auditAction: AuditAction
  entityType: string
  entityId: number
  metadata: Record<string, unknown>
  flashKey: string
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

/** Nombre max de suggestions de démarrage servies au panneau. */
export const ASSISTANT_MAX_STARTERS = 3

/**
 * Suggestion de démarrage (fil vide) : construite côté serveur depuis la page
 * courante et l'état de la flotte, rendue par `t(i18nKey, params)` — un clic
 * envoie le libellé rendu comme message utilisateur. Texte 100 % i18n.
 */
export interface AssistantStarterProps {
  id: string
  i18nKey: string
  params: Record<string, string>
}

/** Conversation envoyée au panneau (prop partagée `assistantConversation`). */
export interface AssistantConversationProps {
  token: string
  status: AssistantStatus
  messages: AssistantMessage[]
  pendingAction: AssistantPendingAction | null
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
