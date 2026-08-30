import { AiInvalidResponseError } from '#exceptions/ai_errors'
import type {
  AiSuggestionLocale,
  EngineDiagnosisInput,
  EngineDiagnosisResult,
} from '#shared/types/ai'
import { sheetsForEngineFamily } from '#shared/helpers/diagnostic'
import { DIAGNOSTIC_SHEET_SLUGS, type DiagnosticSheetSlug } from '#shared/types/diagnostic'
import { isEngineFamily, type EngineFamily } from '#shared/types/engine_catalog'

/**
 * Prompts localisés du diagnostic de panne moteur assisté par IA (#516),
 * **paramétrés par famille de motorisation** depuis #576.
 *
 * Builders purs (aucune dépendance Adonis) pour rester testables sans
 * conteneur ni base de données — même convention que `ai_prompt_service.ts`.
 *
 * Le prompt système embarque un condensé des fiches de diagnostic (#515, #576 —
 * la source de vérité du contenu) et deux garde-fous propres à ce domaine :
 * ne jamais inventer de spec chiffrée propre à un modèle de moteur, et ne
 * recommander qu'une fiche existante.
 *
 * La famille est le point sensible de l'issue : tant que le `2T` était codé en
 * dur, un in-bord diesel devenu éligible se serait vu diagnostiquer en 2 temps —
 * mélange 50:1, clapets, link & sync — soit des conseils faux sur un moteur qui
 * n'a rien de tout cela. Le condensé injecté et la liste de fiches autorisées
 * sont donc dérivés de la famille, pas d'une constante.
 */

/**
 * Groupes de familles servis par un corpus de fiches distinct. `outboard_2t`
 * est le corpus de #515, `inboard` celui de #576 ; toute autre famille n'a pas
 * de fiche et n'atteint jamais ce service (elle n'est pas éligible).
 */
type DiagnosisFamilyGroup = 'outboard_2t' | 'inboard'

function familyGroup(family: EngineFamily | null): DiagnosisFamilyGroup {
  return family === 'outboard_2t' || family === null ? 'outboard_2t' : 'inboard'
}

/** Famille d'un contexte de diagnostic, `null` si elle n'est pas renseignée. */
function inputFamily(engine: { family?: string | null }): EngineFamily | null {
  return isEngineFamily(engine.family) ? engine.family : null
}

// Exporté pour le chat public de diagnostic (#602), qui réutilise le même
// socle de connaissance sans exposer les slugs de fiches aux visiteurs.
export const SHEET_DIGESTS: Record<AiSuggestionLocale, string> = {
  fr: `Fiches de diagnostic disponibles (slug → contenu) :
- "compression" (fiche 1) : compression faible ou inégale. Critère n°1 : l'écart entre cylindres (< 12 % = bon, ≥ 13 % = mauvais), pas la valeur brute. Réparation chère (segments, joint de culasse).
- "ignition" (fiche 2) : pas d'étincelle ou étincelle faible. Du plus simple au plus cher : coupe-circuit, bougies neuves à l'écartement vérifié, bobines (gel du dos sec/craquelé = morte), redresseur, régime de lancement ≥ 250 tr/min, masses, stator/timer base/power pack mesurés en ohms. Aucun cylindre = cause commune ; un seul cylindre = bougie ou bobine.
- "fuel" (fiche 3) : alimentation essence, le coupable n°1 (7 à 8,5 pannes sur 10 ; le carburateur représente ~85 % des pannes de fonctionnement). Suivre le circuit : réservoir → durite + poire → filtre → pompe → carburateur → clapets.
- "cooling" (fiche 4) : pas de jet témoin, surchauffe. Du gratuit au lourd : téton du témoin bouché, thermostat, impeller (~15 €), tube d'eau, chemises d'eau.
- "gearcase" (fiche 5) : embase, hélice, transmission. Huile laiteuse = eau (joints spi). Goupille de cisaillement ou moyeu débrayé si l'hélice patine.
- "electrical" (fiche 6) : démarreur, solénoïde, batterie. Toujours commencer par la batterie et les cosses.
- "timing" (fiche 7) : calage et link & sync — seulement après réfection carbu/allumage ou tringlerie touchée. Une avance max excessive perce les pistons.
- "first-contact" (fiche 8) : premier contact avant achat d'occasion.
Règle d'or : Compression → Étincelle → Essence, toujours dans cet ordre — on teste du moins cher au plus cher.`,
  en: `Available diagnostic sheets (slug → content):
- "compression" (sheet 1): low or uneven compression. Criterion #1: the spread between cylinders (< 12% = good, ≥ 13% = bad), not the raw value. Expensive repair (rings, head gasket).
- "ignition" (sheet 2): no spark or weak spark. Cheapest first: kill switch, new plugs with checked gap, coils (dry/cracked back gel = dead), rectifier, cranking speed ≥ 250 rpm, grounds, stator/timer base/power pack measured in ohms. No cylinder sparking = common cause; a single cylinder = plug or coil.
- "fuel" (sheet 3): fuel supply, the #1 culprit (7 to 8.5 failures out of 10; the carburetor accounts for ~85% of running issues). Follow the circuit: tank → hose + primer bulb → filter → pump → carburetor → reed valves.
- "cooling" (sheet 4): no tell-tale stream, overheating. Free to heavy: clogged tell-tale fitting, thermostat, impeller (~€15), water tube, water jackets.
- "gearcase" (sheet 5): lower unit, propeller, transmission. Milky oil = water (seals). Shear pin or spun hub if the prop slips.
- "electrical" (sheet 6): starter, solenoid, battery. Always start with the battery and terminals.
- "timing" (sheet 7): timing and link & sync — only after carb/ignition work or touched linkage. Excessive maximum advance burns holes in pistons.
- "first-contact" (sheet 8): first inspection before a second-hand purchase.
Golden rule: Compression → Spark → Fuel, always in that order — test from cheapest to most expensive.`,
}

/** Condensé du corpus in-bord (#576) — diesel ligne d'arbre, saildrive, embase Z, groupe. */
export const INBOARD_SHEET_DIGESTS: Record<AiSuggestionLocale, string> = {
  fr: `Fiches de diagnostic disponibles (slug → contenu) :
- "inboard-cooling" : surchauffe, alarme de température, vapeur à l'échappement. Suivre l'eau de mer dans l'ordre : vanne de coque, crépine, durite écrasée, turbine, couvercle de pompe ; puis le circuit fermé : niveau, courroie, thermostat, échangeur entartré, anodes. Pas d'eau à l'échappement au démarrage = couper immédiatement.
- "diesel-fuel" : circuit gasoil — la cause n°1 sur un diesel de plaisance, presque toujours de l'eau ou des dépôts. Démarre puis cale, perte de puissance dans la houle : bol du préfiltre décanteur, cartouche, filtre moteur, purge, entrée d'air côté aspiration, pompe d'alimentation, retour d'injecteurs.
- "diesel-smoke" : couleur des fumées comme aide au tri. Noire = combustion (air, surcharge, contre-pression) ; blanche = eau ou injection ; bleue = huile. À lire moteur chaud, en charge.
- "wet-exhaust" : échappement humide et waterlock. Coude d'échappement corrodé ou entartré, waterlock plein, tuyau affaissé, col de cygne trop bas, casse-siphon bouché. Risque d'eau dans les cylindres si on insiste au démarreur.
- "gearbox" : inverseur — pas d'engagement, à-coups. Niveau et couleur de l'huile (laiteuse = eau par le refroidisseur), câble de commande et course du levier, accouplement souple, joint spi de sortie.
- "shaft-line" : ligne d'arbre et presse-étoupe — vibrations, entrée d'eau au passage de coque. Goutte à goutte réglé, serrage, âge de la tresse, bague hydrolube, jeu d'arbre, alignement, hélice engagée.
- "saildrive" : entrée d'eau, huile émulsionnée. Le soufflet a une **date de péremption** (typiquement 7 ans) : hors d'âge, c'est un risque de voie d'eau, pas une pièce d'usure ordinaire. Anodes, niveau et aspect de l'huile, joint d'embase, compatibilité de l'antifouling avec l'embase alu.
- "electrical" : démarrage et charge — coupe-batterie, cosses, batterie de servitude distincte, préchauffage, relais, démarreur, courroie et débit d'alternateur.
Règle d'or : un diesel a besoin d'air propre, de gasoil propre et de refroidissement. On contrôle d'abord ce qui se voit sans outil (vanne, crépine, bol du préfiltre, niveaux, courroie), avant tout démontage.`,
  en: `Available diagnostic sheets (slug → content):
- "inboard-cooling": overheating, temperature alarm, steam at the exhaust. Follow the raw water in order: sea cock, strainer, collapsed hose, impeller, pump cover; then the closed circuit: level, belt, thermostat, scaled heat exchanger, anodes. No water at the exhaust on start-up = shut down immediately.
- "diesel-fuel": fuel circuit — the #1 cause on a leisure diesel, almost always water or deposits. Starts then stalls, power loss in a swell: pre-filter bowl, element, engine filter, bleeding, air leak on the suction side, lift pump, injector return.
- "diesel-smoke": exhaust smoke colour as a sorting aid. Black = combustion (air, overload, back pressure); white = water or injection; blue = oil. Read it with a hot engine, under load.
- "wet-exhaust": wet exhaust and waterlock. Corroded or scaled exhaust elbow, full waterlock, sagging hose, swan neck too low, blocked siphon break. Risk of water in the cylinders if you keep cranking.
- "gearbox": transmission — no engagement, jerky shifts. Oil level and colour (milky = water through the cooler), control cable and lever travel, damper plate, output seal.
- "shaft-line": shaft line and stuffing box — vibration, water ingress at the hull fitting. Drip rate, tightening, packing age, cutless bearing, shaft play, alignment, fouled propeller.
- "saildrive": water ingress, emulsified oil. The diaphragm has an **expiry date** (typically 7 years): out of date, it is a flooding risk, not an ordinary wear part. Anodes, oil level and condition, drive seal, antifouling compatible with the aluminium leg.
- "electrical": starting and charging — battery switch, terminals, separate service battery, glow plugs, relay, starter, belt and alternator output.
Golden rule: a diesel needs clean air, clean fuel and cooling. Check what is visible without a tool first (sea cock, strainer, pre-filter bowl, levels, belt), before dismantling anything.`,
}

/** Condensé injecté dans le prompt système, choisi par la famille du moteur. */
export function sheetDigestForFamily(
  family: EngineFamily | null,
  locale: AiSuggestionLocale
): string {
  return familyGroup(family) === 'inboard' ? INBOARD_SHEET_DIGESTS[locale] : SHEET_DIGESTS[locale]
}

/**
 * Description de la motorisation posée en tête du prompt système. Remplace le
 * « mécanicien expert en moteurs hors-bord 2 temps » codé en dur : c'est la
 * phrase qui décidait du cadre de raisonnement du modèle.
 */
const FAMILY_EXPERTISE: Record<DiagnosisFamilyGroup, Record<AiSuggestionLocale, string>> = {
  outboard_2t: {
    fr: 'moteurs hors-bord 2 temps',
    en: '2-stroke outboard',
  },
  inboard: {
    fr: "motorisations in-bord de plaisance — diesel en ligne d'arbre ou saildrive, embase Z et groupe électrogène",
    en: 'leisure inboard engines — diesel on a shaft line or saildrive, sterndrives and generators',
  },
}

/** Libellé de la famille, tel qu'il apparaît dans la ligne « Moteur » du message. */
const FAMILY_LABELS: Record<EngineFamily, Record<AiSuggestionLocale, string>> = {
  outboard_2t: { fr: 'hors-bord 2 temps', en: '2-stroke outboard' },
  outboard_4t: { fr: 'hors-bord 4 temps', en: '4-stroke outboard' },
  inboard_diesel_shaft: { fr: "in-bord diesel, ligne d'arbre", en: 'inboard diesel, shaft line' },
  inboard_diesel_saildrive: { fr: 'in-bord diesel, saildrive', en: 'inboard diesel, saildrive' },
  inboard_petrol: { fr: 'in-bord essence', en: 'inboard petrol' },
  sterndrive: { fr: 'embase Z', en: 'sterndrive' },
  pod_drive: { fr: 'propulsion POD', en: 'pod drive' },
  jet: { fr: 'hydrojet', en: 'jet drive' },
  electric_outboard: { fr: 'hors-bord électrique', en: 'electric outboard' },
  electric_inboard: { fr: 'in-bord électrique', en: 'electric inboard' },
  hybrid: { fr: 'hybride', en: 'hybrid' },
  generator: { fr: 'groupe électrogène', en: 'generator set' },
  other: { fr: 'motorisation non précisée', en: 'unspecified engine type' },
}

const UNKNOWN_FAMILY: Record<AiSuggestionLocale, string> = {
  fr: 'motorisation non précisée',
  en: 'unspecified engine type',
}

const SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es un mécanicien expert en {expertise}, intégré à une application de gestion de bateaux qui guide l'utilisateur à travers des checklists de diagnostic de panne.

{digest}

Règles impératives :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, avec exactement ces clés : "summary" (famille de panne probable ou lecture de la progression, 300 caractères max), "recommendedSheet" (un des slugs listés ci-dessus, jamais un autre), "causes" (tableau de 2 à 3 causes probables, chacune 200 caractères max, ordonnées de la MOINS chère à la PLUS chère à vérifier), "nextStep" (la prochaine étape concrète à réaliser, 200 caractères max).
- Rédige tout en français, quelle que soit la langue des données fournies.
- N'invente JAMAIS de spécification chiffrée propre à un modèle de moteur (couple de serrage, degrés d'avance, PSI attendus, résistances) : renvoie au manuel d'atelier du modèle pour toute valeur spécifique. Seuls les ordres de grandeur déjà présents dans les fiches ci-dessus peuvent être cités.
- Tu recommandes, tu ne décides pas : tes conseils ne remplacent pas le manuel d'atelier.
Exemple de réponse : {"summary":"Panne d'alimentation probable","recommendedSheet":"fuel","causes":["Évent du réservoir fermé","Filtre à essence bouché","Gicleur de ralenti obstrué"],"nextStep":"Vérifier que la poire d'amorçage durcit complètement"}`,
  en: `You are an expert {expertise} mechanic, embedded in a boat management application that walks the user through troubleshooting checklists.

{digest}

Mandatory rules:
- Reply ONLY with a valid JSON object, no text around it, with exactly these keys: "summary" (probable failure family or reading of the progress, 300 characters max), "recommendedSheet" (one of the slugs listed above, never anything else), "causes" (array of 2 to 3 probable causes, each 200 characters max, ordered from the CHEAPEST to the MOST expensive to check), "nextStep" (the next concrete step to perform, 200 characters max).
- Write everything in English, whatever the language of the data provided.
- NEVER invent a numeric specification specific to an engine model (torque values, timing degrees, expected PSI, resistances): refer the user to the model's service manual for any specific value. Only the orders of magnitude already present in the sheets above may be quoted.
- You recommend, you do not decide: your advice does not replace the service manual.
Example response: {"summary":"Probable fuel supply issue","recommendedSheet":"fuel","causes":["Closed tank vent","Clogged fuel filter","Blocked idle jet"],"nextStep":"Check that the primer bulb firms up completely"}`,
}

interface DiagnosisLabels {
  intro: Record<'symptoms' | 'progress', string>
  engine: string
  unknownBrand: string
  unknownHours: string
  parts: string
  none: string
  events: string
  checklist: string
  checkedSteps: (checked: number, total: number) => string
  noCheckedSteps: string
  symptoms: string
  progressNotes: string
  noProgressNotes: string
  colon: string
}

const LABELS: Record<AiSuggestionLocale, DiagnosisLabels> = {
  fr: {
    intro: {
      symptoms:
        "Oriente le diagnostic de ce moteur à partir des symptômes décrits par l'utilisateur :",
      progress:
        "Analyse la progression de l'utilisateur dans les checklists de diagnostic de ce moteur (incohérence, étape sautée, réorientation vers une autre fiche si les résultats l'indiquent) :",
    },
    engine: 'Moteur',
    unknownBrand: 'marque inconnue',
    unknownHours: 'heures inconnues',
    parts: 'Pièces suivies',
    none: 'Aucune',
    events: 'Dernières maintenances sur ce moteur (5 max)',
    checklist: 'Progression dans les checklists',
    checkedSteps: (checked, total) =>
      `${checked}/${total} étapes de la checklist globale cochées. Étapes cochées (toutes fiches confondues) :`,
    noCheckedSteps: 'Aucune étape cochée pour le moment.',
    symptoms: "Symptômes décrits par l'utilisateur",
    progressNotes: "Notes et résultats saisis par l'utilisateur",
    noProgressNotes: 'Aucune note saisie.',
    colon: ' : ',
  },
  en: {
    intro: {
      symptoms: 'Orient the diagnosis of this engine from the symptoms described by the user:',
      progress:
        "Review the user's progress through this engine's troubleshooting checklists (inconsistency, skipped step, redirection to another sheet if the results call for it):",
    },
    engine: 'Engine',
    unknownBrand: 'unknown brand',
    unknownHours: 'unknown hours',
    parts: 'Tracked parts',
    none: 'None',
    events: 'Latest maintenance operations on this engine (5 max)',
    checklist: 'Checklist progress',
    checkedSteps: (checked, total) =>
      `${checked}/${total} global checklist steps checked. Checked steps (all sheets included):`,
    noCheckedSteps: 'No step checked yet.',
    symptoms: 'Symptoms described by the user',
    progressNotes: 'Notes and results entered by the user',
    noProgressNotes: 'No notes entered.',
    colon: ': ',
  },
}

/**
 * Prompt système du diagnostic moteur, cadré par la **famille** (#576).
 *
 * `family` absente (contexte ancien, moteur sans motorisation renseignée) →
 * corpus hors-bord 2 temps, le comportement de #516 à l'identique.
 */
export function buildEngineDiagnosisSystemPrompt(
  locale: AiSuggestionLocale,
  family: EngineFamily | null = null
): string {
  return SYSTEM_PROMPTS[locale]
    .replace('{expertise}', FAMILY_EXPERTISE[familyGroup(family)][locale])
    .replace('{digest}', sheetDigestForFamily(family, locale))
}

export function buildEngineDiagnosisUserMessage(
  input: EngineDiagnosisInput,
  locale: AiSuggestionLocale
): string {
  const { engine, parts, maintenanceEvents, checklist, mode, userText } = input
  const l = LABELS[locale]

  // La famille remplace le « 2T » codé en dur de #516 : c'est la seule ligne du
  // message qui dise au modèle sur quel type de moteur il raisonne.
  const family = inputFamily(engine)
  const familyLabel = family ? FAMILY_LABELS[family][locale] : UNKNOWN_FAMILY[locale]
  const engineLine = `${engine.brand ?? l.unknownBrand} ${engine.model ?? ''} (${familyLabel}, ${engine.hours ?? l.unknownHours}h)`

  const partsList =
    parts.length > 0
      ? parts.map((p) => `- ${p.designation}${p.wearState ? ` (${p.wearState})` : ''}`).join('\n')
      : l.none

  const eventsList =
    maintenanceEvents.length > 0
      ? maintenanceEvents
          .slice(0, 5)
          .map((ev) => `- ${ev.performedAt}${l.colon}${ev.title} (${ev.subject})`)
          .join('\n')
      : l.none

  const checkedList =
    checklist.checkedStepKeys.length > 0
      ? `${l.checkedSteps(
          checklist.checkedStepKeys.filter((key) => key.startsWith('global.')).length,
          checklist.totalGlobalSteps
        )}\n${checklist.checkedStepKeys.map((key) => `- ${key}`).join('\n')}`
      : l.noCheckedSteps

  const userTextBlock =
    mode === 'symptoms'
      ? `${l.symptoms}${l.colon}\n${userText}`
      : `${l.progressNotes}${l.colon}\n${userText.length > 0 ? userText : l.noProgressNotes}`

  return `${l.intro[mode]}

${l.engine}${l.colon}${engineLine}

${l.parts}${l.colon}
${partsList}

${l.events}${l.colon}
${eventsList}

${l.checklist}${l.colon}
${checkedList}

${userTextBlock}`
}

/**
 * Parse la réponse du modèle en `EngineDiagnosisResult`.
 *
 * Contrairement au `#parseResponse()` des suggestions (qui dégrade en liste
 * vide), une réponse invalide lève ici une `AiInvalidResponseError` : le
 * diagnostic est une réponse structurée dont chaque champ est affiché — un
 * objet partiel ou une fiche inventée ne doivent jamais être persistés.
 */
export function parseEngineDiagnosisResponse(
  raw: string,
  family: EngineFamily | null = null
): EngineDiagnosisResult {
  let parsed: unknown
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw.trim())
  } catch {
    throw new AiInvalidResponseError('Engine diagnosis response is not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new AiInvalidResponseError('Engine diagnosis response is not a JSON object')
  }

  const candidate = parsed as Record<string, unknown>
  const { summary, recommendedSheet, causes, nextStep } = candidate

  if (typeof summary !== 'string' || summary.trim().length === 0) {
    throw new AiInvalidResponseError('Engine diagnosis response has no summary')
  }
  if (
    typeof recommendedSheet !== 'string' ||
    !DIAGNOSTIC_SHEET_SLUGS.includes(recommendedSheet as DiagnosticSheetSlug)
  ) {
    throw new AiInvalidResponseError('Engine diagnosis response references an unknown sheet')
  }
  // Une fiche valide dans l'absolu peut être hors sujet pour la motorisation :
  // renvoyer un diesel vers « link & sync » serait un conseil faux, pas une
  // simple imprécision. Sans famille connue on ne restreint pas (#516).
  if (family && !sheetsForEngineFamily(family).some((sheet) => sheet.slug === recommendedSheet)) {
    throw new AiInvalidResponseError(
      'Engine diagnosis response references a sheet that does not apply to this engine family'
    )
  }
  if (typeof nextStep !== 'string' || nextStep.trim().length === 0) {
    throw new AiInvalidResponseError('Engine diagnosis response has no next step')
  }
  if (!Array.isArray(causes)) {
    throw new AiInvalidResponseError('Engine diagnosis response has no causes array')
  }

  const causeTexts = causes.filter(
    (cause): cause is string => typeof cause === 'string' && cause.trim().length > 0
  )
  if (causeTexts.length === 0) {
    throw new AiInvalidResponseError('Engine diagnosis response has no usable cause')
  }

  return {
    summary: summary.trim(),
    recommendedSheet: recommendedSheet as DiagnosticSheetSlug,
    causes: causeTexts.map((cause) => cause.trim()),
    nextStep: nextStep.trim(),
  }
}
