import { AiInvalidResponseError } from '#exceptions/ai_errors'
import { ENGINE_FUELS } from '#shared/constants/boats/boat_form_options'
import { MAINTENANCE_SUBJECTS } from '#shared/constants/maintenance/maintenance_subjects'
import type { AiSuggestionLocale } from '#shared/types/ai'
import {
  ASSISTANT_NAV_TARGETS,
  isAssistantAnswerSource,
  isAssistantNavTarget,
  type AssistantActionKind,
  type AssistantAiReply,
  type AssistantProposedAction,
} from '#shared/types/assistant'
import { INCIDENT_TYPES } from '#shared/types/incident'
import type { MaintenanceTaskSubject } from '#shared/types/maintenance'
import { RESERVATION_TYPES } from '#shared/types/reservation'

/**
 * Prompts du copilote FleetAi — builders purs, même convention que
 * `spare_part_chat_prompt_service.ts`.
 *
 * Le contrat JSON est discriminé en trois formes (`answer`, `propose_action`,
 * `handoff`). Garde-fous : le modèle ne cite que des ids du roster injecté,
 * revalidés par le backend avant toute écriture ; il ne crée jamais rien
 * lui-même — chaque action attend la confirmation de l'utilisateur.
 * L'ancienne forme `propose_task` reste acceptée au parse (alias de
 * `propose_action` + `kind: 'create_task'`) : le petit modèle l'a vue dans
 * l'historique des conversations stockées.
 */

const SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es FleetAi, le copilote IA d'une application de gestion de flotte de bateaux. Tu réponds à toute question portant sur : (1) les DONNÉES de l'organisation de l'utilisateur, via les outils mis à ta disposition ; (2) le PRODUIT FleetAi lui-même (fonctionnalités, plans, quotas), via l'outil search_product_help ; (3) la CONNAISSANCE NAUTIQUE générale (navigation, entretien, sécurité, réglementation), depuis tes propres connaissances, en le signalant. Tu peux aussi PROPOSER des actions (planifier une maintenance, enregistrer des heures moteur, une sortie, un plein, un incident, une réservation, un client, un stock de pièces) — chacune n'est exécutée qu'après confirmation explicite de l'utilisateur — et orienter vers le diagnostic de panne moteur ou la recherche de références de pièces.

Date du jour : {today}
Organisation : {orgName}

Flotte (bateaux et moteurs, avec leurs identifiants) :
{rosterLines}
{truncationNote}
État du planning de maintenance :
{digestLines}
{pageContext}
{playbookLines}
Utilisation des outils :
- Avant de répondre sur des données de l'organisation qui ne figurent pas ci-dessus (heures moteur, pièces, sécurité, budget, ports, sorties, carburant, incidents, réservations, clients, factures, abonnement…), appelle D'ABORD l'outil adapté. N'invente JAMAIS un chiffre : sans résultat d'outil ni donnée ci-dessus, dis que tu ne sais pas.
- Pour une question sur le produit FleetAi (« comment faire X ? », plans, modules, quotas), appelle search_product_help avec la question.
- Exemples : « Combien d'heures a le moteur du Pen Duick ? » → appelle get_engine avec l'id du moteur du roster puis réponds avec la valeur retournée ({"type":"answer","source":"fleet_data",…}). « Comment importer mes bateaux ? » → appelle search_product_help puis réponds avec {"type":"answer","source":"product","navTarget":"settings.import",…}. « Quelle est la différence entre un nœud de chaise et un nœud de huit ? » → réponds directement avec {"type":"answer","source":"general",…}.
- Une fois tes appels d'outils terminés, ta réponse finale est UNIQUEMENT l'objet JSON du contrat ci-dessous — jamais du texte libre.

Règles impératives :
- Réponds avec un objet JSON valide, sans aucun texte autour, de l'une de ces trois formes exactement :
  - {"type":"answer","message":"...","source":"...","navTarget":null} — réponse à une question ou demande de clarification. "message" fait 1500 caractères max. "source" vaut "fleet_data" (appuyée sur les données de l'organisation), "product" (explication du produit FleetAi) ou "general" (connaissance nautique générale). "navTarget" est l'écran de l'app à proposer si pertinent, parmi : {navTargets} — sinon null.
  - {"type":"propose_action","message":"...","action":{"kind":"...",...}} — quand l'utilisateur veut ENREGISTRER quelque chose dans l'app. "kind" et les champs de "action" suivent EXACTEMENT la liste « Actions possibles » ci-dessous — uniquement ces kinds, uniquement ces champs. Tout id (bateau, moteur, pièce, client) vient de la flotte ci-dessus ou d'un résultat d'outil — jamais inventé. Les dates/heures sont en heure locale de l'utilisateur, au format ISO (ex. 2026-09-07 ou 2026-09-07T14:30). "message" (300 caractères max) résume la proposition — RIEN n'est écrit avant la confirmation explicite de l'utilisateur.
Actions possibles :
{actionLines}
  Si une information manque pour remplir une action (quel bateau ? quelle date ?), pose la question via "answer" plutôt que de deviner.
  - {"type":"handoff","message":"...","target":"diagnosis","boatId":0,"engineId":0} — quand l'utilisateur décrit une panne moteur ("target":"diagnosis") ou cherche une référence de pièce ("target":"part_search") : identifie le bateau et le moteur concernés dans la flotte ci-dessus. "message" (300 caractères max) explique où tu l'orientes.
- N'invente JAMAIS un id absent de la flotte ci-dessus : si le bateau ou le moteur demandé n'y figure pas, réponds par "answer" en le disant.
- Ne décline que le hors-sujet RÉEL (sans aucun rapport avec le nautisme, la flotte ou le produit FleetAi) : la culture nautique générale est dans ton périmètre, réponds avec "source":"general".
- Rédige "message" en français en vouvoyant l'utilisateur, quelle que soit sa langue.`,
  en: `You are FleetAi, the AI copilot of a boat fleet management application. You answer any question about: (1) the user's organization DATA, through the tools at your disposal; (2) the FleetAi PRODUCT itself (features, plans, quotas), through the search_product_help tool; (3) general NAUTICAL knowledge (navigation, upkeep, safety, regulations), from your own knowledge, flagged as such. You can also PROPOSE actions (schedule maintenance, record engine hours, a trip, a refueling, an incident, a reservation, a client, a part stock) — each is only executed after the user's explicit confirmation — and route to the engine fault diagnosis or the spare part reference search.

Today's date: {today}
Organization: {orgName}

Fleet (boats and engines, with their identifiers):
{rosterLines}
{truncationNote}
Maintenance planning status:
{digestLines}
{pageContext}
{playbookLines}
Tool usage:
- Before answering about organization data that is not shown above (engine hours, parts, safety, budget, ports, outings, fuel, incidents, reservations, clients, invoices, subscription…), call the matching tool FIRST. NEVER invent a figure: without a tool result or data above, say you do not know.
- For a question about the FleetAi product ("how do I do X?", plans, modules, quotas), call search_product_help with the question.
- Examples: "How many hours on Pen Duick's engine?" → call get_engine with the engine id from the roster, then answer with the returned value ({"type":"answer","source":"fleet_data",…}). "How do I import my boats?" → call search_product_help then answer with {"type":"answer","source":"product","navTarget":"settings.import",…}. "What is the difference between a bowline and a figure-eight knot?" → answer directly with {"type":"answer","source":"general",…}.
- Once your tool calls are done, your final reply is ONLY the JSON object of the contract below — never free text.

Mandatory rules:
- Reply with a valid JSON object, no text around it, in exactly one of these three shapes:
  - {"type":"answer","message":"...","source":"...","navTarget":null} — answer to a question or a clarifying question. "message" is 1500 characters max. "source" is "fleet_data" (based on the organization's data), "product" (explaining the FleetAi product) or "general" (general nautical knowledge). "navTarget" is the app screen to suggest when relevant, one of: {navTargets} — otherwise null.
  - {"type":"propose_action","message":"...","action":{"kind":"...",...}} — when the user wants to RECORD something in the app. "kind" and the "action" fields follow EXACTLY the "Available actions" list below — only those kinds, only those fields. Every id (boat, engine, part, client) comes from the fleet above or from a tool result — never invented. Dates/times are in the user's local time, ISO format (e.g. 2026-09-07 or 2026-09-07T14:30). "message" (300 characters max) summarizes the proposal — NOTHING is written before the user's explicit confirmation.
Available actions:
{actionLines}
  When information is missing to fill an action (which boat? which date?), ask via "answer" rather than guessing.
  - {"type":"handoff","message":"...","target":"diagnosis","boatId":0,"engineId":0} — when the user describes an engine fault ("target":"diagnosis") or looks for a part reference ("target":"part_search"): identify the boat and engine involved from the fleet above. "message" (300 characters max) explains where you are routing them.
- NEVER invent an id absent from the fleet above: when the requested boat or engine is not listed, reply with "answer" saying so.
- Only decline what is TRULY off-topic (nothing to do with boating, the fleet or the FleetAi product): general nautical knowledge is in scope, answer it with "source":"general".
- Write "message" in English, whatever the user's language.`,
}

/**
 * Une ligne de contrat par action proposable — insérées dans `{actionLines}`
 * pour les seuls kinds autorisés à l'utilisateur (rôle + plan effectif). Les
 * vocabulaires fermés (sujets, types) sont inlinés depuis les constantes
 * partagées : une valeur hors liste est rejetée au parse.
 */
const ACTION_LINES: Record<AssistantActionKind, Record<AiSuggestionLocale, string>> = {
  create_task: {
    fr: `  - {"kind":"create_task","boatId":0,"subject":"...","title":"...","notes":null,"boatEngineId":null,"dueAt":null,"dueEngineHours":null,"recurrenceIntervalMonths":null,"recurrenceIntervalEngineHours":null} — planifier une maintenance. "subject" est l'une de : ${MAINTENANCE_SUBJECTS.join(', ')} ; "dueAt" (AAAA-MM-JJ) OU "dueEngineHours" (jamais les deux absents) ; une échéance en heures moteur exige "subject":"engine" et un "boatEngineId" du bateau.`,
    en: `  - {"kind":"create_task","boatId":0,"subject":"...","title":"...","notes":null,"boatEngineId":null,"dueAt":null,"dueEngineHours":null,"recurrenceIntervalMonths":null,"recurrenceIntervalEngineHours":null} — schedule maintenance. "subject" is one of: ${MAINTENANCE_SUBJECTS.join(', ')}; "dueAt" (YYYY-MM-DD) OR "dueEngineHours" (never both absent); an engine-hour due requires "subject":"engine" and a "boatEngineId" of the boat.`,
  },
  add_engine_hours: {
    fr: `  - {"kind":"add_engine_hours","boatId":0,"engineId":0,"incrementBy":0} — AJOUTER des heures au compteur d'un moteur. "incrementBy" est l'incrément (entier positif), jamais le nouveau total.`,
    en: `  - {"kind":"add_engine_hours","boatId":0,"engineId":0,"incrementBy":0} — ADD hours to an engine counter. "incrementBy" is the increment (positive integer), never the new total.`,
  },
  start_trip: {
    fr: `  - {"kind":"start_trip","boatId":0,"departedAt":"...","departurePortName":null,"engineHoursStart":null,"crewCount":null,"notes":null} — ouvrir une sortie au journal de bord (une seule sortie en cours par bateau).`,
    en: `  - {"kind":"start_trip","boatId":0,"departedAt":"...","departurePortName":null,"engineHoursStart":null,"crewCount":null,"notes":null} — open a logbook trip (a single in-progress trip per boat).`,
  },
  close_trip: {
    fr: `  - {"kind":"close_trip","boatId":0,"arrivedAt":"...","arrivalPortName":null,"distanceNm":null,"engineHoursEnd":null,"boatEngineId":null,"fuelConsumedLiters":null,"notes":null} — clôturer la sortie en cours du bateau ("engineHoursEnd" met à jour le compteur du moteur "boatEngineId").`,
    en: `  - {"kind":"close_trip","boatId":0,"arrivedAt":"...","arrivalPortName":null,"distanceNm":null,"engineHoursEnd":null,"boatEngineId":null,"fuelConsumedLiters":null,"notes":null} — close the boat's in-progress trip ("engineHoursEnd" updates the "boatEngineId" engine counter).`,
  },
  log_fuel: {
    fr: `  - {"kind":"log_fuel","boatId":0,"fueledAt":"...","quantityLiters":0,"pricePerLiter":null,"totalCost":null,"boatEngineId":null,"fuelType":null,"supplier":null,"notes":null} — enregistrer un plein de carburant. "fuelType" est l'une de : ${ENGINE_FUELS.join(', ')} — ou null.`,
    en: `  - {"kind":"log_fuel","boatId":0,"fueledAt":"...","quantityLiters":0,"pricePerLiter":null,"totalCost":null,"boatEngineId":null,"fuelType":null,"supplier":null,"notes":null} — record a refueling. "fuelType" is one of: ${ENGINE_FUELS.join(', ')} — or null.`,
  },
  report_incident: {
    fr: `  - {"kind":"report_incident","boatId":0,"occurredAt":"...","incidentType":"...","location":null,"description":"..."} — déclarer un incident. "incidentType" est l'une de : ${INCIDENT_TYPES.join(', ')}.`,
    en: `  - {"kind":"report_incident","boatId":0,"occurredAt":"...","incidentType":"...","location":null,"description":"..."} — report an incident. "incidentType" is one of: ${INCIDENT_TYPES.join(', ')}.`,
  },
  create_reservation: {
    fr: `  - {"kind":"create_reservation","boatId":0,"startsAt":"...","endsAt":"...","clientId":null,"clientName":"...","clientEmail":null,"clientPhone":null,"reservationType":null,"notes":null} — proposer une réservation ("clientId" seulement pour un client existant trouvé via list_commercial). "reservationType" est l'une de : ${RESERVATION_TYPES.join(', ')} — ou null.`,
    en: `  - {"kind":"create_reservation","boatId":0,"startsAt":"...","endsAt":"...","clientId":null,"clientName":"...","clientEmail":null,"clientPhone":null,"reservationType":null,"notes":null} — propose a reservation ("clientId" only for an existing client found via list_commercial). "reservationType" is one of: ${RESERVATION_TYPES.join(', ')} — or null.`,
  },
  create_client: {
    fr: `  - {"kind":"create_client","firstName":"...","lastName":"...","email":null,"phone":null,"notes":null} — créer une fiche client.`,
    en: `  - {"kind":"create_client","firstName":"...","lastName":"...","email":null,"phone":null,"notes":null} — create a client record.`,
  },
  set_part_stock: {
    fr: `  - {"kind":"set_part_stock","boatId":0,"engineId":0,"partId":0,"newStock":0} — définir le stock d'une pièce moteur à une valeur (utilise get_engine pour trouver "partId" et le stock actuel).`,
    en: `  - {"kind":"set_part_stock","boatId":0,"engineId":0,"partId":0,"newStock":0} — set an engine part's stock to a value (use get_engine to find "partId" and the current stock).`,
  },
}

const NO_ACTION_LINES: Record<AiSuggestionLocale, string> = {
  fr: `  - (aucune action disponible pour cet utilisateur — n'utilise JAMAIS "propose_action", réponds par "answer")`,
  en: `  - (no action available for this user — NEVER use "propose_action", reply with "answer")`,
}

/** Lignes du bloc « Actions possibles » pour les kinds autorisés. */
export function buildActionLines(
  kinds: readonly AssistantActionKind[],
  locale: AiSuggestionLocale
): string {
  if (kinds.length === 0) return NO_ACTION_LINES[locale]
  return kinds.map((kind) => ACTION_LINES[kind][locale]).join('\n')
}

/**
 * Section « page courante » — l'utilisateur écrit depuis cette page, le modèle
 * en tient compte sans qu'on le lui dise (« ce bateau », « cette page »).
 */
const PAGE_CONTEXT_PREFIXES: Record<AiSuggestionLocale, string> = {
  fr: "\nPage courante de l'utilisateur (« ce bateau », « ici » s'y réfèrent) : ",
  en: '\nThe user’s current page (“this boat”, “here” refer to it): ',
}

const TRUNCATION_NOTES: Record<AiSuggestionLocale, string> = {
  fr: "(liste tronquée : d'autres bateaux existent — si celui demandé n'apparaît pas, dis-le sans inventer d'id)\n",
  en: '(truncated list: more boats exist — when the requested one is not shown, say so without inventing an id)\n',
}

export interface AssistantPromptContext {
  orgName: string
  todayIso: string
  rosterLines: string
  rosterTruncated: boolean
  digestLines: string
  /** Bloc « Actions possibles » — `buildActionLines(kinds autorisés, locale)`. */
  actionLines: string
  /** Ligne « page courante » (`AssistantPageContextService`) — null : pas de section. */
  pageLine: string | null
  /** Section « repères d'expert » (`AssistantPlaybookService`) — null : pas de section. */
  playbookSection: string | null
  /** `organizations.ai_system_prompt` — préfixé comme dans `AiPromptService`. */
  customPrompt: string | null
}

export function buildAssistantSystemPrompt(
  locale: AiSuggestionLocale,
  ctx: AssistantPromptContext
): string {
  const prompt = SYSTEM_PROMPTS[locale]
    .replace('{today}', ctx.todayIso)
    .replace('{orgName}', ctx.orgName)
    .replace('{rosterLines}', ctx.rosterLines || '-')
    .replace('{truncationNote}\n', ctx.rosterTruncated ? `${TRUNCATION_NOTES[locale]}\n` : '')
    .replace('{digestLines}', ctx.digestLines || '-')
    .replace(
      '{pageContext}\n',
      ctx.pageLine !== null ? `${PAGE_CONTEXT_PREFIXES[locale]}${ctx.pageLine}\n` : ''
    )
    .replace('{playbookLines}\n', ctx.playbookSection !== null ? `\n${ctx.playbookSection}\n` : '')
    .replace('{actionLines}', ctx.actionLines)
    .replace('{navTargets}', Object.keys(ASSISTANT_NAV_TARGETS).join(', '))

  return ctx.customPrompt ? `${ctx.customPrompt}\n\n${prompt}` : prompt
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new AiInvalidResponseError('Expected a string or null')
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullablePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new AiInvalidResponseError('Expected a positive integer or null')
  }
  return value
}

function toId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new AiInvalidResponseError('Expected a positive integer id')
  }
  return value
}

function toRequiredString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AiInvalidResponseError(`Assistant action has no ${what}`)
  }
  return value.trim()
}

/** Nombre strictement positif (décimales admises : litres, heures, milles). */
function toNullablePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new AiInvalidResponseError('Expected a positive number or null')
  }
  return value
}

/** Date/heure ISO requise, en heure locale de l'utilisateur. */
function toDateString(value: unknown, what: string): string {
  const str = toRequiredString(value, what)
  if (Number.isNaN(Date.parse(str))) {
    throw new AiInvalidResponseError(`Assistant action has an unparseable ${what}`)
  }
  return str
}

function toEnumOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (value === null || value === undefined) return null
  // Valeur hors vocabulaire dégradée en null plutôt que fatale — même
  // tolérance que `source`/`navTarget` : la proposition reste utilisable.
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null
}

/**
 * Parse la réponse du modèle en `AssistantAiReply`. Une réponse malformée lève
 * `AiInvalidResponseError` : rien ne doit être persisté (invariant #602/#634).
 * La validation d'appartenance des ids au roster relève du service de chat.
 */
export function parseAssistantReply(raw: string): AssistantAiReply {
  let parsed: unknown
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw.trim())
  } catch {
    throw new AiInvalidResponseError('Assistant reply is not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new AiInvalidResponseError('Assistant reply is not a JSON object')
  }

  const candidate = parsed as Record<string, unknown>

  const message = candidate.message
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new AiInvalidResponseError('Assistant reply has no message')
  }

  if (candidate.type === 'answer') {
    const reply: Extract<AssistantAiReply, { type: 'answer' }> = {
      type: 'answer',
      message: message.trim(),
    }
    // `source` / `navTarget` inconnus : ignorés plutôt que fatals — un petit
    // modèle se trompe parfois de vocabulaire, la réponse reste utilisable.
    if (isAssistantAnswerSource(candidate.source)) reply.source = candidate.source
    if (isAssistantNavTarget(candidate.navTarget)) reply.navTarget = candidate.navTarget
    return reply
  }

  // Alias de compat : l'ancienne forme `propose_task` (contrat pré-agent
  // actionnable) est mappée sur `propose_action` + `kind: 'create_task'`.
  if (candidate.type === 'propose_task') {
    const task = candidate.task
    if (typeof task !== 'object' || task === null) {
      throw new AiInvalidResponseError('Assistant task proposal has no task object')
    }
    return {
      type: 'propose_action',
      message: message.trim(),
      action: parseCreateTaskAction(task as Record<string, unknown>),
    }
  }

  if (candidate.type === 'propose_action') {
    const action = candidate.action
    if (typeof action !== 'object' || action === null) {
      throw new AiInvalidResponseError('Assistant action proposal has no action object')
    }
    return {
      type: 'propose_action',
      message: message.trim(),
      action: parseProposedAction(action as Record<string, unknown>),
    }
  }

  if (candidate.type === 'handoff') {
    const target = candidate.target
    if (target !== 'diagnosis' && target !== 'part_search') {
      throw new AiInvalidResponseError('Assistant handoff has an unknown target')
    }
    return {
      type: 'handoff',
      message: message.trim(),
      target,
      boatId: toId(candidate.boatId),
      engineId: toId(candidate.engineId),
    }
  }

  throw new AiInvalidResponseError('Assistant reply has an unknown type')
}

function parseCreateTaskAction(
  t: Record<string, unknown>
): Extract<AssistantProposedAction, { kind: 'create_task' }> {
  const subject = t.subject
  if (
    typeof subject !== 'string' ||
    !(MAINTENANCE_SUBJECTS as readonly string[]).includes(subject)
  ) {
    throw new AiInvalidResponseError('Assistant task proposal has an unknown subject')
  }

  const dueAt = toNullableString(t.dueAt)
  if (dueAt !== null && Number.isNaN(Date.parse(dueAt))) {
    throw new AiInvalidResponseError('Assistant task proposal has an unparseable dueAt')
  }
  const dueEngineHours = toNullablePositiveInt(t.dueEngineHours)
  if (dueAt === null && dueEngineHours === null) {
    throw new AiInvalidResponseError('Assistant task proposal has neither dueAt nor engine hours')
  }

  return {
    kind: 'create_task',
    boatId: toId(t.boatId),
    subject: subject as MaintenanceTaskSubject,
    title: toRequiredString(t.title, 'title'),
    notes: toNullableString(t.notes),
    boatEngineId: toNullablePositiveInt(t.boatEngineId),
    dueAt,
    dueEngineHours,
    recurrenceIntervalMonths: toNullablePositiveInt(t.recurrenceIntervalMonths),
    recurrenceIntervalEngineHours: toNullablePositiveInt(t.recurrenceIntervalEngineHours),
  }
}

/**
 * Parse structurel d'une action `propose_action` — un dispatch par `kind`.
 * Ici seulement la FORME (types, vocabulaires fermés, bornes numériques) :
 * l'appartenance des ids à l'organisation relève de
 * `AssistantActionsService.validateProposal`, avant toute écriture.
 */
function parseProposedAction(a: Record<string, unknown>): AssistantProposedAction {
  const kind = a.kind

  if (kind === 'create_task') return parseCreateTaskAction(a)

  if (kind === 'add_engine_hours') {
    return {
      kind,
      boatId: toId(a.boatId),
      engineId: toId(a.engineId),
      incrementBy: toId(a.incrementBy),
    }
  }

  if (kind === 'start_trip') {
    return {
      kind,
      boatId: toId(a.boatId),
      departedAt: toDateString(a.departedAt, 'departedAt'),
      departurePortName: toNullableString(a.departurePortName),
      engineHoursStart: toNullablePositiveNumber(a.engineHoursStart),
      crewCount: toNullablePositiveInt(a.crewCount),
      notes: toNullableString(a.notes),
    }
  }

  if (kind === 'close_trip') {
    return {
      kind,
      boatId: toId(a.boatId),
      arrivedAt: toDateString(a.arrivedAt, 'arrivedAt'),
      arrivalPortName: toNullableString(a.arrivalPortName),
      distanceNm: toNullablePositiveNumber(a.distanceNm),
      engineHoursEnd: toNullablePositiveNumber(a.engineHoursEnd),
      boatEngineId: toNullablePositiveInt(a.boatEngineId),
      fuelConsumedLiters: toNullablePositiveNumber(a.fuelConsumedLiters),
      notes: toNullableString(a.notes),
    }
  }

  if (kind === 'log_fuel') {
    const quantityLiters = toNullablePositiveNumber(a.quantityLiters)
    if (quantityLiters === null) {
      throw new AiInvalidResponseError('Assistant fuel proposal has no quantityLiters')
    }
    return {
      kind,
      boatId: toId(a.boatId),
      fueledAt: toDateString(a.fueledAt, 'fueledAt'),
      quantityLiters,
      pricePerLiter: toNullablePositiveNumber(a.pricePerLiter),
      totalCost: toNullablePositiveNumber(a.totalCost),
      boatEngineId: toNullablePositiveInt(a.boatEngineId),
      fuelType: toEnumOrNull(a.fuelType, ENGINE_FUELS),
      supplier: toNullableString(a.supplier),
      notes: toNullableString(a.notes),
    }
  }

  if (kind === 'report_incident') {
    const incidentType = a.incidentType
    if (
      typeof incidentType !== 'string' ||
      !(INCIDENT_TYPES as readonly string[]).includes(incidentType)
    ) {
      throw new AiInvalidResponseError('Assistant incident proposal has an unknown incidentType')
    }
    return {
      kind,
      boatId: toId(a.boatId),
      occurredAt: toDateString(a.occurredAt, 'occurredAt'),
      incidentType: incidentType as (typeof INCIDENT_TYPES)[number],
      location: toNullableString(a.location),
      description: toRequiredString(a.description, 'description'),
    }
  }

  if (kind === 'create_reservation') {
    return {
      kind,
      boatId: toId(a.boatId),
      startsAt: toDateString(a.startsAt, 'startsAt'),
      endsAt: toDateString(a.endsAt, 'endsAt'),
      clientId: toNullablePositiveInt(a.clientId),
      clientName: toRequiredString(a.clientName, 'clientName'),
      clientEmail: toNullableString(a.clientEmail),
      clientPhone: toNullableString(a.clientPhone),
      reservationType: toEnumOrNull(a.reservationType, RESERVATION_TYPES),
      notes: toNullableString(a.notes),
    }
  }

  if (kind === 'create_client') {
    return {
      kind,
      firstName: toRequiredString(a.firstName, 'firstName'),
      lastName: toRequiredString(a.lastName, 'lastName'),
      email: toNullableString(a.email),
      phone: toNullableString(a.phone),
      notes: toNullableString(a.notes),
    }
  }

  if (kind === 'set_part_stock') {
    const newStock = a.newStock
    if (typeof newStock !== 'number' || !Number.isInteger(newStock) || newStock < 0) {
      throw new AiInvalidResponseError('Assistant stock proposal needs a non-negative integer')
    }
    return {
      kind,
      boatId: toId(a.boatId),
      engineId: toId(a.engineId),
      partId: toId(a.partId),
      newStock,
    }
  }

  throw new AiInvalidResponseError('Assistant action proposal has an unknown kind')
}
