import { AiInvalidResponseError } from '#exceptions/ai_errors'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type { EngineReferencePattern } from '#shared/types/engine_catalog'
import type { PartSearchPhase, SparePartChatAiReply } from '#shared/types/spare_part_chat'

/**
 * Prompts localisés du chat IA de recherche de références de pièces (#634).
 *
 * Builders purs (aucune dépendance Adonis), même convention que
 * `public_diagnosis_prompt_service.ts`. Le prompt système dépend de la
 * **phase** de la conversation et ne contient que le contexte de cette phase :
 * en identification, le motif de plaque et la liste des codes candidats de la
 * marque ; en choix de pièce, le vocabulaire fermé du catalogue.
 *
 * Garde-fou central (anti-hallucination) : le modèle ne cite JAMAIS de
 * référence constructeur — il ne rend que des identifiants du vocabulaire
 * injecté (`modelCode` de la liste, `partKey` du catalogue), que le backend
 * revalide avant toute écriture.
 */

const ENGINE_SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es un assistant d'identification de moteurs marins, intégré à FleetAi, une application de gestion de bateaux. Un utilisateur cherche la référence d'une pièce détachée pour son moteur {brandName} : avant de parler pièces, il faut identifier le modèle exact du moteur à partir de son numéro de série ou du code de sa plaque signalétique.

Numéro de série enregistré sur le moteur : {serialNumber}
{patternHint}
Modèles connus de la marque (nom — code plaque) :
{modelLines}

Règles impératives :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, de l'une de ces deux formes exactement :
  - {"type":"question","message":"..."} — UNE question de clarification (300 caractères max), par exemple pour demander le numéro de série ou le code plaque s'il manque ;
  - {"type":"engine","modelCode":"...","message":"..."} — dès que tu peux te prononcer : "modelCode" est un code plaque ou un nom EXACTEMENT tel qu'il figure dans la liste ci-dessus, ou null si aucun modèle de la liste ne correspond ; "message" (300 caractères max) dit ce que tu as identifié, ou explique honnêtement que tu n'as pas pu.
- N'invente JAMAIS un code absent de la liste : en cas de doute, renvoie null plutôt qu'une supposition.
- Le code plaque figure souvent en préfixe du numéro de série — appuie-toi dessus pour départager les variantes.
- Ne cite JAMAIS de référence de pièce détachée : ce n'est pas encore le sujet.
- Pose le moins de questions possible.
- Rédige "message" en français en vouvoyant l'utilisateur, quelle que soit sa langue.`,
  en: `You are a marine engine identification assistant, embedded in FleetAi, a boat management application. A user is looking for a spare part reference for their {brandName} engine: before talking parts, the exact engine model must be identified from its serial number or the code on its identification plate.

Serial number recorded on the engine: {serialNumber}
{patternHint}
Known models for this brand (name — plate code):
{modelLines}

Mandatory rules:
- Reply ONLY with a valid JSON object, no text around it, in exactly one of these two shapes:
  - {"type":"question","message":"..."} — ONE clarifying question (300 characters max), for instance to ask for the serial number or plate code when it is missing;
  - {"type":"engine","modelCode":"...","message":"..."} — as soon as you can commit: "modelCode" is a plate code or a name EXACTLY as it appears in the list above, or null when no model from the list matches; "message" (300 characters max) states what you identified, or honestly explains that you could not.
- NEVER invent a code absent from the list: when in doubt, return null rather than a guess.
- The plate code often appears as a prefix of the serial number — rely on it to tell variants apart.
- NEVER quote a spare part reference: that is not the topic yet.
- Ask as few questions as possible.
- Write "message" in English, whatever the user's language.`,
}

const PART_SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es un assistant de recherche de pièces détachées marines, intégré à FleetAi, une application de gestion de bateaux. L'utilisateur possède le moteur suivant : {engineLabel}. Ta mission : comprendre quelle pièce il cherche et la faire correspondre à UNE entrée du catalogue ci-dessous.

Catalogue de pièces (clé — intitulé catalogue) :
{vocabularyLines}

Règles impératives :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, de l'une de ces deux formes exactement :
  - {"type":"question","message":"..."} — UNE question de clarification (300 caractères max) quand tu hésites entre plusieurs pièces du catalogue ;
  - {"type":"part","partKey":"...","message":"..."} — dès que tu peux te prononcer : "partKey" est une clé EXACTEMENT telle qu'elle figure dans le catalogue ci-dessus, ou null si aucune entrée ne correspond à la demande ; "message" (300 caractères max) confirme la pièce retenue, ou explique honnêtement qu'aucune ne correspond.
- Ne cite JAMAIS de référence constructeur ni de numéro de pièce : la référence est fournie par la base de données de FleetAi, jamais par toi.
- N'invente JAMAIS une clé absente du catalogue : en cas de doute entre deux, pose une question ; si rien ne correspond, renvoie null.
- Pose le moins de questions possible : si la demande est claire, rends la pièce directement.
- Rédige "message" en français en vouvoyant l'utilisateur, quelle que soit sa langue.`,
  en: `You are a marine spare parts search assistant, embedded in FleetAi, a boat management application. The user owns the following engine: {engineLabel}. Your mission: understand which part they are looking for and match it to ONE entry of the catalog below.

Parts catalog (key — catalog label):
{vocabularyLines}

Mandatory rules:
- Reply ONLY with a valid JSON object, no text around it, in exactly one of these two shapes:
  - {"type":"question","message":"..."} — ONE clarifying question (300 characters max) when you hesitate between several catalog parts;
  - {"type":"part","partKey":"...","message":"..."} — as soon as you can commit: "partKey" is a key EXACTLY as it appears in the catalog above, or null when no entry matches the request; "message" (300 characters max) confirms the selected part, or honestly explains that none matches.
- NEVER quote a manufacturer reference or a part number: the reference comes from the FleetAi database, never from you.
- NEVER invent a key absent from the catalog: when hesitating between two, ask a question; when nothing matches, return null.
- Ask as few questions as possible: when the request is clear, return the part right away.
- Write "message" in English, whatever the user's language.`,
}

interface SparePartChatLabels {
  intro: string
  brand: string
  model: string
  serialNumber: string
  unknown: string
  request: string
  patternHint: string
  finalTurnEngine: string
  finalTurnPart: string
}

const LABELS: Record<AiSuggestionLocale, SparePartChatLabels> = {
  fr: {
    intro: 'Un utilisateur cherche une pièce détachée pour son moteur de bateau.',
    brand: 'Marque',
    model: 'Modèle saisi',
    serialNumber: 'Numéro de série',
    unknown: 'non renseigné',
    request: 'Demande',
    patternHint:
      "Chez cette marque, les références de pièces suivent le motif {template} : le premier bloc est le code plaque du modèle (motif attendu d'un code plaque : {modelCodePattern}).",
    finalTurnEngine:
      'C\'était le dernier échange possible : rends maintenant ta réponse finale (réponse de type "engine", avec un code de la liste ou null), même si un doute subsiste.',
    finalTurnPart:
      'C\'était le dernier échange possible : rends maintenant ta réponse finale (réponse de type "part", avec une clé du catalogue ou null), même si un doute subsiste.',
  },
  en: {
    intro: 'A user is looking for a spare part for their boat engine.',
    brand: 'Brand',
    model: 'Entered model',
    serialNumber: 'Serial number',
    unknown: 'not provided',
    request: 'Request',
    patternHint:
      'For this brand, part references follow the {template} pattern: the first block is the model plate code (expected plate code pattern: {modelCodePattern}).',
    finalTurnEngine:
      'This was the last possible exchange: deliver your final answer now (an "engine" reply, with a code from the list or null), even if some doubt remains.',
    finalTurnPart:
      'This was the last possible exchange: deliver your final answer now (a "part" reply, with a catalog key or null), even if some doubt remains.',
  },
}

export interface EngineIdentificationPromptInput {
  brandName: string
  serialNumber: string | null
  /** Motif de référence de la marque (#575), `null` quand elle n'en a pas. */
  referencePattern: EngineReferencePattern | null
  /** Lignes `nom — code plaque` des modèles candidats de la marque. */
  modelLines: string
}

export interface PartSearchPromptInput {
  /** Libellé du moteur (modèle identifié, ou marque + saisie libre). */
  engineLabel: string
  /** Lignes `clé — intitulé catalogue` du vocabulaire fermé. */
  vocabularyLines: string
}

export interface PartSearchFirstMessageInput {
  message: string
  brand: string | null
  model: string | null
  serialNumber: string | null
}

export function buildEngineIdentificationSystemPrompt(
  locale: AiSuggestionLocale,
  input: EngineIdentificationPromptInput
): string {
  const l = LABELS[locale]
  const patternHint = input.referencePattern
    ? `${l.patternHint
        .replace('{template}', input.referencePattern.template)
        .replace('{modelCodePattern}', input.referencePattern.modelCodePattern)}\n`
    : ''

  return ENGINE_SYSTEM_PROMPTS[locale]
    .replaceAll('{brandName}', input.brandName)
    .replace('{serialNumber}', input.serialNumber ?? l.unknown)
    .replace('{patternHint}\n', patternHint)
    .replace('{modelLines}', input.modelLines)
}

export function buildPartSearchSystemPrompt(
  locale: AiSuggestionLocale,
  input: PartSearchPromptInput
): string {
  return PART_SYSTEM_PROMPTS[locale]
    .replace('{engineLabel}', input.engineLabel)
    .replace('{vocabularyLines}', input.vocabularyLines)
}

/**
 * Premier message utilisateur reconstruit avec le contexte moteur — le fil
 * stocké ne garde que le texte tapé, affiché tel quel (pattern #602).
 */
export function buildPartSearchFirstMessage(
  input: PartSearchFirstMessageInput,
  locale: AiSuggestionLocale
): string {
  const l = LABELS[locale]
  return `${l.intro}

${l.brand} : ${input.brand ?? l.unknown}
${l.model} : ${input.model ?? l.unknown}
${l.serialNumber} : ${input.serialNumber ?? l.unknown}

${l.request} :
${input.message}`
}

/**
 * Instruction ajoutée au dernier message utilisateur autorisé pour forcer une
 * sortie décisive dans la phase courante (cf. `PART_SEARCH_MAX_USER_MESSAGES`).
 */
export function buildPartSearchFinalTurnInstruction(
  locale: AiSuggestionLocale,
  phase: PartSearchPhase
): string {
  return phase === 'engine' ? LABELS[locale].finalTurnEngine : LABELS[locale].finalTurnPart
}

/**
 * Parse la réponse du modèle en `SparePartChatAiReply`.
 *
 * Un `type` étranger à la phase courante est une réponse invalide : le prompt
 * de la phase ne propose que `question` et sa sortie propre. Comme
 * `parsePublicDiagnosisReply` (#602), une réponse invalide lève
 * `AiInvalidResponseError` et rien ne doit être persisté.
 */
export function parseSparePartChatReply(raw: string, phase: PartSearchPhase): SparePartChatAiReply {
  let parsed: unknown
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw.trim())
  } catch {
    throw new AiInvalidResponseError('Part search reply is not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new AiInvalidResponseError('Part search reply is not a JSON object')
  }

  const candidate = parsed as Record<string, unknown>

  const message = candidate.message
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new AiInvalidResponseError('Part search reply has no message')
  }

  if (candidate.type === 'question') {
    return { type: 'question', message: message.trim() }
  }

  if (candidate.type === 'engine') {
    if (phase !== 'engine') {
      throw new AiInvalidResponseError('Part search reply type does not match the part phase')
    }
    const { modelCode } = candidate
    if (modelCode !== null && (typeof modelCode !== 'string' || modelCode.trim().length === 0)) {
      throw new AiInvalidResponseError('Part search engine reply has an invalid model code')
    }
    return {
      type: 'engine',
      modelCode: typeof modelCode === 'string' ? modelCode.trim() : null,
      message: message.trim(),
    }
  }

  if (candidate.type === 'part') {
    if (phase !== 'part') {
      throw new AiInvalidResponseError('Part search reply type does not match the engine phase')
    }
    const { partKey } = candidate
    if (partKey !== null && (typeof partKey !== 'string' || partKey.trim().length === 0)) {
      throw new AiInvalidResponseError('Part search part reply has an invalid part key')
    }
    return {
      type: 'part',
      partKey: typeof partKey === 'string' ? partKey.trim() : null,
      message: message.trim(),
    }
  }

  throw new AiInvalidResponseError('Part search reply has an unknown type')
}
