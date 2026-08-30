import { AiInvalidResponseError } from '#exceptions/ai_errors'
import { SHEET_DIGESTS } from '#services/engine_diagnosis_prompt_service'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type {
  PublicDiagnosisAiReply,
  PublicDiagnosisStartInput,
} from '#shared/types/public_diagnosis'

/**
 * Prompts localisés du chat IA public de diagnostic de panne (#602).
 *
 * Builders purs (aucune dépendance Adonis), même convention que
 * `engine_diagnosis_prompt_service.ts` dont le digest des fiches (#515) sert
 * de socle de connaissance. Deux différences avec le diagnostic authentifié :
 * le modèle peut poser des questions de clarification (sortie JSON discriminée
 * `question` / `diagnosis`), et il ne cite JAMAIS de slug de fiche — les
 * fiches `/diagnostic/*` restent réservées aux comptes connectés.
 */

const SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es un mécanicien expert en moteurs de bateau, intégré au site public de FleetAi, une application de gestion de bateaux. Un visiteur décrit une panne : tu l'aides à l'identifier en posant au besoin des questions de clarification, puis tu rends un diagnostic.

Socle de connaissance (ne mentionne JAMAIS ces slugs ni les numéros de fiche dans tes réponses) :
{digest}

Règles impératives :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, de l'une de ces deux formes exactement :
  - {"type":"question","message":"..."} — UNE question de clarification (300 caractères max) quand il te manque une information décisive ;
  - {"type":"diagnosis","summary":"...","causes":["..."],"nextStep":"..."} — dès que tu peux te prononcer : "summary" (famille de panne probable, 300 caractères max), "causes" (2 à 3 causes probables, chacune 200 caractères max, ordonnées de la MOINS chère à la PLUS chère à vérifier), "nextStep" (prochaine étape concrète, 200 caractères max).
- Pose le moins de questions possible : si la description suffit, rends le diagnostic directement.
- Rédige tout en français, quelle que soit la langue du visiteur.
- N'invente JAMAIS de spécification chiffrée propre à un modèle de moteur (couple de serrage, degrés d'avance, PSI attendus, résistances) : renvoie au manuel d'atelier pour toute valeur spécifique. Seuls les ordres de grandeur du socle ci-dessus peuvent être cités.
- Tu recommandes, tu ne décides pas : tes conseils ne remplacent pas le manuel d'atelier ni un professionnel.`,
  en: `You are an expert boat engine mechanic, embedded in the public website of FleetAi, a boat management application. A visitor describes a breakdown: you help identify it, asking clarifying questions when needed, then deliver a diagnosis.

Knowledge base (NEVER mention these slugs or sheet numbers in your replies):
{digest}

Mandatory rules:
- Reply ONLY with a valid JSON object, no text around it, in exactly one of these two shapes:
  - {"type":"question","message":"..."} — ONE clarifying question (300 characters max) when a decisive piece of information is missing;
  - {"type":"diagnosis","summary":"...","causes":["..."],"nextStep":"..."} — as soon as you can commit: "summary" (probable failure family, 300 characters max), "causes" (2 to 3 probable causes, each 200 characters max, ordered from the CHEAPEST to the MOST expensive to check), "nextStep" (next concrete step, 200 characters max).
- Ask as few questions as possible: if the description is sufficient, deliver the diagnosis right away.
- Write everything in English, whatever the visitor's language.
- NEVER invent a numeric specification specific to an engine model (torque values, timing degrees, expected PSI, resistances): refer the visitor to the service manual for any specific value. Only the orders of magnitude already present in the knowledge base above may be quoted.
- You recommend, you do not decide: your advice replaces neither the service manual nor a professional.`,
}

interface PublicDiagnosisLabels {
  intro: string
  engineType: string
  brand: string
  hours: string
  unknown: string
  description: string
  finalTurn: string
}

const LABELS: Record<AiSuggestionLocale, PublicDiagnosisLabels> = {
  fr: {
    intro: 'Un visiteur décrit une panne sur son moteur de bateau.',
    engineType: 'Type de moteur',
    brand: 'Marque',
    hours: 'Heures moteur',
    unknown: 'non précisé',
    description: 'Description de la panne',
    finalTurn:
      'C\'était le dernier échange possible : rends maintenant ton diagnostic final (réponse de type "diagnosis"), même si des incertitudes subsistent.',
  },
  en: {
    intro: 'A visitor describes a breakdown on their boat engine.',
    engineType: 'Engine type',
    brand: 'Brand',
    hours: 'Engine hours',
    unknown: 'not provided',
    description: 'Breakdown description',
    finalTurn:
      'This was the last possible exchange: deliver your final diagnosis now (a "diagnosis" reply), even if some uncertainty remains.',
  },
}

export function buildPublicDiagnosisSystemPrompt(locale: AiSuggestionLocale): string {
  return SYSTEM_PROMPTS[locale].replace('{digest}', SHEET_DIGESTS[locale])
}

export function buildPublicDiagnosisFirstMessage(
  input: PublicDiagnosisStartInput,
  locale: AiSuggestionLocale
): string {
  const l = LABELS[locale]
  return `${l.intro}

${l.engineType} : ${input.engineType ?? l.unknown}
${l.brand} : ${input.brand ?? l.unknown}
${l.hours} : ${input.hours ?? l.unknown}

${l.description} :
${input.message}`
}

/**
 * Instruction ajoutée au dernier message utilisateur autorisé pour forcer la
 * sortie `diagnosis` (cf. `PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES`).
 */
export function buildFinalTurnInstruction(locale: AiSuggestionLocale): string {
  return LABELS[locale].finalTurn
}

/**
 * Parse la réponse du modèle en `PublicDiagnosisAiReply`.
 *
 * Comme `parseEngineDiagnosisResponse` (#516) : une réponse invalide lève
 * `AiInvalidResponseError` et rien ne doit être persisté — chaque champ est
 * affiché tel quel au visiteur.
 */
export function parsePublicDiagnosisReply(raw: string): PublicDiagnosisAiReply {
  let parsed: unknown
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw.trim())
  } catch {
    throw new AiInvalidResponseError('Public diagnosis reply is not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new AiInvalidResponseError('Public diagnosis reply is not a JSON object')
  }

  const candidate = parsed as Record<string, unknown>

  if (candidate.type === 'question') {
    const { message } = candidate
    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new AiInvalidResponseError('Public diagnosis question has no message')
    }
    return { type: 'question', message: message.trim() }
  }

  if (candidate.type === 'diagnosis') {
    const { summary, causes, nextStep } = candidate
    if (typeof summary !== 'string' || summary.trim().length === 0) {
      throw new AiInvalidResponseError('Public diagnosis reply has no summary')
    }
    if (typeof nextStep !== 'string' || nextStep.trim().length === 0) {
      throw new AiInvalidResponseError('Public diagnosis reply has no next step')
    }
    if (!Array.isArray(causes)) {
      throw new AiInvalidResponseError('Public diagnosis reply has no causes array')
    }
    const causeTexts = causes.filter(
      (cause): cause is string => typeof cause === 'string' && cause.trim().length > 0
    )
    if (causeTexts.length === 0) {
      throw new AiInvalidResponseError('Public diagnosis reply has no usable cause')
    }
    return {
      type: 'diagnosis',
      result: {
        summary: summary.trim(),
        causes: causeTexts.map((cause) => cause.trim()),
        nextStep: nextStep.trim(),
      },
    }
  }

  throw new AiInvalidResponseError('Public diagnosis reply has an unknown type')
}
