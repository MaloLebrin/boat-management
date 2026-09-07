import { AiInvalidResponseError } from '#exceptions/ai_errors'
import { MAINTENANCE_SUBJECTS } from '#shared/constants/maintenance/maintenance_subjects'
import type { AiSuggestionLocale } from '#shared/types/ai'
import {
  ASSISTANT_NAV_TARGETS,
  isAssistantAnswerSource,
  isAssistantNavTarget,
  type AssistantAiReply,
} from '#shared/types/assistant'
import type { MaintenanceTaskSubject } from '#shared/types/maintenance'

/**
 * Prompts du copilote FleetAi — builders purs, même convention que
 * `spare_part_chat_prompt_service.ts`.
 *
 * Le contrat JSON est discriminé en trois formes (`answer`, `propose_task`,
 * `handoff`). Garde-fous : le modèle ne cite que des ids du roster injecté,
 * revalidés par le backend avant toute écriture ; il ne crée jamais rien
 * lui-même — une proposition de tâche attend la confirmation de l'utilisateur.
 */

const SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es FleetAi, le copilote IA d'une application de gestion de flotte de bateaux. Tu réponds à toute question portant sur : (1) les DONNÉES de l'organisation de l'utilisateur, via les outils mis à ta disposition ; (2) le PRODUIT FleetAi lui-même (fonctionnalités, plans, quotas), via l'outil search_product_help ; (3) la CONNAISSANCE NAUTIQUE générale (navigation, entretien, sécurité, réglementation), depuis tes propres connaissances, en le signalant. Tu peux aussi proposer la création d'une tâche de maintenance et orienter vers le diagnostic de panne moteur ou la recherche de références de pièces.

Date du jour : {today}
Organisation : {orgName}

Flotte (bateaux et moteurs, avec leurs identifiants) :
{rosterLines}
{truncationNote}
État du planning de maintenance :
{digestLines}

Utilisation des outils :
- Avant de répondre sur des données de l'organisation qui ne figurent pas ci-dessus (heures moteur, pièces, sécurité, budget, ports, sorties, carburant, incidents, réservations, clients, factures, abonnement…), appelle D'ABORD l'outil adapté. N'invente JAMAIS un chiffre : sans résultat d'outil ni donnée ci-dessus, dis que tu ne sais pas.
- Pour une question sur le produit FleetAi (« comment faire X ? », plans, modules, quotas), appelle search_product_help avec la question.
- Exemples : « Combien d'heures a le moteur du Pen Duick ? » → appelle get_engine avec l'id du moteur du roster puis réponds avec la valeur retournée ({"type":"answer","source":"fleet_data",…}). « Comment importer mes bateaux ? » → appelle search_product_help puis réponds avec {"type":"answer","source":"product","navTarget":"settings.import",…}. « Quelle est la différence entre un nœud de chaise et un nœud de huit ? » → réponds directement avec {"type":"answer","source":"general",…}.
- Une fois tes appels d'outils terminés, ta réponse finale est UNIQUEMENT l'objet JSON du contrat ci-dessous — jamais du texte libre.

Règles impératives :
- Réponds avec un objet JSON valide, sans aucun texte autour, de l'une de ces trois formes exactement :
  - {"type":"answer","message":"...","source":"...","navTarget":null} — réponse à une question ou demande de clarification. "message" fait 1500 caractères max. "source" vaut "fleet_data" (appuyée sur les données de l'organisation), "product" (explication du produit FleetAi) ou "general" (connaissance nautique générale). "navTarget" est l'écran de l'app à proposer si pertinent, parmi : {navTargets} — sinon null.
  - {"type":"propose_task","message":"...","task":{"boatId":0,"subject":"...","title":"...","notes":null,"boatEngineId":null,"dueAt":null,"dueEngineHours":null,"recurrenceIntervalMonths":null,"recurrenceIntervalEngineHours":null}} — quand l'utilisateur veut planifier une maintenance. "boatId" est un id de la flotte ci-dessus ; "subject" est l'une de : {subjects} ; "dueAt" est une date ISO (AAAA-MM-JJ) OU "dueEngineHours" un nombre d'heures moteur (jamais les deux absents) ; une échéance en heures moteur exige "subject":"engine" et un "boatEngineId" du bateau. "message" (300 caractères max) résume la proposition — la tâche ne sera créée qu'après confirmation de l'utilisateur.
  - {"type":"handoff","message":"...","target":"diagnosis","boatId":0,"engineId":0} — quand l'utilisateur décrit une panne moteur ("target":"diagnosis") ou cherche une référence de pièce ("target":"part_search") : identifie le bateau et le moteur concernés dans la flotte ci-dessus. "message" (300 caractères max) explique où tu l'orientes.
- N'invente JAMAIS un id absent de la flotte ci-dessus : si le bateau ou le moteur demandé n'y figure pas, réponds par "answer" en le disant.
- Si une information manque pour proposer une tâche (quel bateau ? quelle échéance ?), pose la question via "answer" plutôt que de deviner.
- Ne décline que le hors-sujet RÉEL (sans aucun rapport avec le nautisme, la flotte ou le produit FleetAi) : la culture nautique générale est dans ton périmètre, réponds avec "source":"general".
- Rédige "message" en français en vouvoyant l'utilisateur, quelle que soit sa langue.`,
  en: `You are FleetAi, the AI copilot of a boat fleet management application. You answer any question about: (1) the user's organization DATA, through the tools at your disposal; (2) the FleetAi PRODUCT itself (features, plans, quotas), through the search_product_help tool; (3) general NAUTICAL knowledge (navigation, upkeep, safety, regulations), from your own knowledge, flagged as such. You can also propose the creation of a maintenance task and route to the engine fault diagnosis or the spare part reference search.

Today's date: {today}
Organization: {orgName}

Fleet (boats and engines, with their identifiers):
{rosterLines}
{truncationNote}
Maintenance planning status:
{digestLines}

Tool usage:
- Before answering about organization data that is not shown above (engine hours, parts, safety, budget, ports, outings, fuel, incidents, reservations, clients, invoices, subscription…), call the matching tool FIRST. NEVER invent a figure: without a tool result or data above, say you do not know.
- For a question about the FleetAi product ("how do I do X?", plans, modules, quotas), call search_product_help with the question.
- Examples: "How many hours on Pen Duick's engine?" → call get_engine with the engine id from the roster, then answer with the returned value ({"type":"answer","source":"fleet_data",…}). "How do I import my boats?" → call search_product_help then answer with {"type":"answer","source":"product","navTarget":"settings.import",…}. "What is the difference between a bowline and a figure-eight knot?" → answer directly with {"type":"answer","source":"general",…}.
- Once your tool calls are done, your final reply is ONLY the JSON object of the contract below — never free text.

Mandatory rules:
- Reply with a valid JSON object, no text around it, in exactly one of these three shapes:
  - {"type":"answer","message":"...","source":"...","navTarget":null} — answer to a question or a clarifying question. "message" is 1500 characters max. "source" is "fleet_data" (based on the organization's data), "product" (explaining the FleetAi product) or "general" (general nautical knowledge). "navTarget" is the app screen to suggest when relevant, one of: {navTargets} — otherwise null.
  - {"type":"propose_task","message":"...","task":{"boatId":0,"subject":"...","title":"...","notes":null,"boatEngineId":null,"dueAt":null,"dueEngineHours":null,"recurrenceIntervalMonths":null,"recurrenceIntervalEngineHours":null}} — when the user wants to schedule maintenance. "boatId" is an id from the fleet above; "subject" is one of: {subjects}; "dueAt" is an ISO date (YYYY-MM-DD) OR "dueEngineHours" an engine-hour count (never both absent); an engine-hour due requires "subject":"engine" and a "boatEngineId" belonging to the boat. "message" (300 characters max) summarizes the proposal — the task is only created after the user confirms.
  - {"type":"handoff","message":"...","target":"diagnosis","boatId":0,"engineId":0} — when the user describes an engine fault ("target":"diagnosis") or looks for a part reference ("target":"part_search"): identify the boat and engine involved from the fleet above. "message" (300 characters max) explains where you are routing them.
- NEVER invent an id absent from the fleet above: when the requested boat or engine is not listed, reply with "answer" saying so.
- When information is missing to propose a task (which boat? which due date?), ask via "answer" rather than guessing.
- Only decline what is TRULY off-topic (nothing to do with boating, the fleet or the FleetAi product): general nautical knowledge is in scope, answer it with "source":"general".
- Write "message" in English, whatever the user's language.`,
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
    .replace('{subjects}', MAINTENANCE_SUBJECTS.join(', '))
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

  if (candidate.type === 'propose_task') {
    const task = candidate.task
    if (typeof task !== 'object' || task === null) {
      throw new AiInvalidResponseError('Assistant task proposal has no task object')
    }
    const t = task as Record<string, unknown>

    const subject = t.subject
    if (
      typeof subject !== 'string' ||
      !(MAINTENANCE_SUBJECTS as readonly string[]).includes(subject)
    ) {
      throw new AiInvalidResponseError('Assistant task proposal has an unknown subject')
    }

    const title = t.title
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new AiInvalidResponseError('Assistant task proposal has no title')
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
      type: 'propose_task',
      message: message.trim(),
      task: {
        boatId: toId(t.boatId),
        subject: subject as MaintenanceTaskSubject,
        title: title.trim(),
        notes: toNullableString(t.notes),
        boatEngineId: toNullablePositiveInt(t.boatEngineId),
        dueAt,
        dueEngineHours,
        recurrenceIntervalMonths: toNullablePositiveInt(t.recurrenceIntervalMonths),
        recurrenceIntervalEngineHours: toNullablePositiveInt(t.recurrenceIntervalEngineHours),
      },
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
