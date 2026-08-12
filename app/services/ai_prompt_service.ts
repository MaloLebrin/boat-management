import type { AiSuggestionLocale, BoatSuggestionsInput, FleetAnalysisInput } from '#shared/types/ai'

/**
 * Prompts localisés des suggestions IA (#460).
 *
 * Le prompt système ET le message utilisateur sont construits dans la langue de
 * l'utilisateur : un prompt entièrement français produit des suggestions
 * françaises même quand la consigne finale demande de l'anglais. Les deux
 * doivent donc basculer ensemble.
 *
 * Builders purs (aucune dépendance Adonis) pour rester testables sans conteneur
 * ni base de données.
 */

const SYSTEM_PROMPTS: Record<AiSuggestionLocale, string> = {
  fr: `Tu es un expert en maintenance marine pour une application de gestion de flotte.
Réponds UNIQUEMENT avec un tableau JSON valide d'objets. Chaque objet a une seule clé "text" contenant une suggestion courte et concrète rédigée en français (maximum 120 caractères).
Rédige toutes les suggestions en français, quelle que soit la langue des données fournies.
Retourne entre 2 et 5 suggestions. N'inclus aucun texte en dehors du tableau JSON.
Exemple: [{"text":"Vérifier l'antifouling — dernière application il y a 13 mois"},{"text":"Vidange moteur à planifier — 490h atteintes"}]`,
  en: `You are a marine maintenance expert working on a fleet management application.
Reply ONLY with a valid JSON array of objects. Each object has a single "text" key holding a short, concrete suggestion written in English (120 characters max).
Write every suggestion in English, whatever the language of the data provided.
Return between 2 and 5 suggestions. Do not include any text outside the JSON array.
Example: [{"text":"Check the antifouling — last applied 13 months ago"},{"text":"Schedule an engine oil change — 490h reached"}]`,
}

interface PromptLabels {
  /** « Aucun » — listes au masculin (moteurs, gréement, équipements, événements) */
  noneMasculine: string
  /** « Aucune » — listes au féminin (voiles, maintenances) */
  noneFeminine: string
  unknownType: string
  unknownFuel: string
  unknownYear: string
  unknownPropulsion: string
  unknownPort: string
  unknownCategory: string
  engines: string
  sails: string
  rig: string
  rigs: string
  boats: string
  dueDate: string
  currentHours: (current: number | null, due: number | null) => string
  expiresOn: string
  /** Séparateur des puces : le français insère une espace insécable avant le « : » */
  colon: string
}

const LABELS: Record<AiSuggestionLocale, PromptLabels> = {
  fr: {
    noneMasculine: 'Aucun',
    noneFeminine: 'Aucune',
    unknownType: 'type inconnu',
    unknownFuel: 'carburant inconnu',
    unknownYear: 'année inconnue',
    unknownPropulsion: 'inconnue',
    unknownPort: 'inconnu',
    unknownCategory: 'inconnue',
    engines: 'moteur(s)',
    sails: 'voile(s)',
    rig: 'gréement',
    rigs: 'gréement(s)',
    boats: 'bateau(x)',
    dueDate: "date d'échéance",
    currentHours: (current, due) => `${current}h actuelles / ${due}h requises`,
    expiresOn: 'expire',
    colon: ' : ',
  },
  en: {
    noneMasculine: 'None',
    noneFeminine: 'None',
    unknownType: 'unknown type',
    unknownFuel: 'unknown fuel',
    unknownYear: 'unknown year',
    unknownPropulsion: 'unknown',
    unknownPort: 'unknown',
    unknownCategory: 'unknown',
    engines: 'engine(s)',
    sails: 'sail(s)',
    rig: 'rig',
    rigs: 'rig(s)',
    boats: 'boat(s)',
    dueDate: 'due date',
    currentHours: (current, due) => `${current}h logged / ${due}h required`,
    expiresOn: 'expires',
    colon: ': ',
  },
}

export function buildSystemPrompt(locale: AiSuggestionLocale): string {
  return SYSTEM_PROMPTS[locale]
}

export function buildFleetUserMessage(
  input: FleetAnalysisInput,
  locale: AiSuggestionLocale
): string {
  const { boats, urgentMaintenance, stats } = input
  const l = LABELS[locale]

  const boatsList = boats
    .map(
      (b) =>
        `- ${b.name} (${b.propulsionType ?? l.unknownType})${l.colon}${b.enginesCount} ${l.engines}, ${b.sailsCount} ${l.sails}${b.hasRig ? `, ${l.rig}` : ''}`
    )
    .join('\n')

  let urgentList = l.noneFeminine
  if (urgentMaintenance.length > 0) {
    urgentList = urgentMaintenance
      .map((m) => {
        if (m.kind === 'date') {
          return `- ${m.boatName}${l.colon}${m.title} — ${l.dueDate} ${m.dueAt}`
        }
        return `- ${m.boatName}${l.colon}${m.title} — ${l.currentHours(m.currentEngineHours, m.dueEngineHours)}`
      })
      .join('\n')
  }

  if (locale === 'en') {
    return `Analyze this fleet of boats and generate priority maintenance suggestions:

Statistics: ${stats.boats} ${l.boats}, ${stats.engines} ${l.engines}, ${stats.sails} ${l.sails}, ${stats.rigs} ${l.rigs}
Urgent maintenance: ${stats.urgentMaintenance}

Boats:
${boatsList}

Urgent maintenance:
${urgentList}`
  }

  return `Analyse cette flotte de bateaux et génère des suggestions de maintenance prioritaires :

Statistiques : ${stats.boats} ${l.boats}, ${stats.engines} ${l.engines}, ${stats.sails} ${l.sails}, ${stats.rigs} ${l.rigs}
Maintenances urgentes : ${stats.urgentMaintenance}

Bateaux :
${boatsList}

Maintenances urgentes :
${urgentList}`
}

export function buildBoatUserMessage(
  input: BoatSuggestionsInput,
  locale: AiSuggestionLocale
): string {
  const { boat, maintenanceTasks, maintenanceEvents } = input
  const l = LABELS[locale]

  const enginesList =
    boat.engines.length > 0
      ? boat.engines
          .map(
            (e) =>
              `- ${e.kind} ${e.brand ?? ''} ${e.model ?? ''} (${e.fuel ?? l.unknownFuel}, ${e.hours ?? '?'}h)`
          )
          .join('\n')
      : l.noneMasculine

  const sailsList =
    boat.sails.length > 0
      ? boat.sails.map((s) => `- ${s.sailType} (${s.status})`).join('\n')
      : l.noneFeminine

  const rigInfo = boat.rig ? `${boat.rig.rigType} (${boat.rig.status})` : l.noneMasculine

  const safetyList =
    boat.safetyEquipment.length > 0
      ? boat.safetyEquipment
          .map(
            (eq) =>
              `- ${eq.equipmentType} (${eq.status})${eq.expiryDate ? ` — ${l.expiresOn} ${eq.expiryDate}` : ''}`
          )
          .join('\n')
      : l.noneMasculine

  const openTasks = maintenanceTasks.filter((t) => t.status === 'open')
  const tasksWithDueAt = openTasks.filter((t) => t.dueAt !== null)

  const recentEvents = maintenanceEvents.slice(0, 5)
  const eventsList =
    recentEvents.length > 0
      ? recentEvents.map((ev) => `- ${ev.performedAt}${l.colon}${ev.title}`).join('\n')
      : l.noneFeminine

  if (locale === 'en') {
    return `Analyze this boat and generate specific maintenance suggestions:

Boat: ${boat.name} (${boat.manufacturer ?? ''} ${boat.model ?? ''}, ${boat.yearBuilt ?? l.unknownYear})
Type: ${boat.type ?? l.unknownType}, Propulsion: ${boat.propulsionType ?? l.unknownPropulsion}
Home port: ${boat.homePort ?? l.unknownPort}, Category: ${boat.navigationCategory ?? l.unknownCategory}

Engines:
${enginesList}

Sails:
${sailsList}

Rig: ${rigInfo}

Safety equipment:
${safetyList}

Open tasks: ${openTasks.length}, ${tasksWithDueAt.length} of them with a due date

Latest maintenance operations (5 max):
${eventsList}`
  }

  return `Analyse ce bateau et génère des suggestions de maintenance spécifiques :

Bateau : ${boat.name} (${boat.manufacturer ?? ''} ${boat.model ?? ''}, ${boat.yearBuilt ?? l.unknownYear})
Type : ${boat.type ?? l.unknownType}, Propulsion : ${boat.propulsionType ?? l.unknownPropulsion}
Port d'attache : ${boat.homePort ?? l.unknownPort}, Catégorie : ${boat.navigationCategory ?? l.unknownCategory}

Moteurs :
${enginesList}

Voiles :
${sailsList}

Gréement : ${rigInfo}

Équipements sécurité :
${safetyList}

Tâches ouvertes : ${openTasks.length} dont ${tasksWithDueAt.length} avec date d'échéance

Dernières maintenances (5 max) :
${eventsList}`
}
