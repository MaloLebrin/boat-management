import type { AiSuggestionLocale, EngineSuggestionsInput } from '#shared/types/ai'

/**
 * Prompt des suggestions IA d'un moteur (`kind: 'engine_suggestions'`).
 *
 * Même contrat de sortie que les suggestions bateau (tableau JSON de `{text}`,
 * cf. `buildSystemPrompt` de `ai_prompt_service.ts`, réutilisé tel quel) : seul
 * le message utilisateur change — identité et heures du moteur, pièces (usure,
 * stock, achat), tâches et derniers événements du moteur, intervalles du
 * catalogue d'opérations standard de sa famille (#581).
 *
 * Builder pur (aucune dépendance Adonis) — les labels du catalogue arrivent
 * déjà localisés dans l'input (`AiSuggestionContextService`).
 */

interface EnginePromptLabels {
  noneMasculine: string
  noneFeminine: string
  unknownFuel: string
  hours: (hours: number, sinceInstall: number | null) => string
  unknownHours: string
  wear: string
  stock: (stock: number, min: number) => string
  purchasedOn: string
  dueDate: string
  dueHours: (hours: number) => string
  every: (months: number | null, engineHours: number | null) => string
  colon: string
}

const LABELS: Record<AiSuggestionLocale, EnginePromptLabels> = {
  fr: {
    noneMasculine: 'Aucun',
    noneFeminine: 'Aucune',
    unknownFuel: 'carburant inconnu',
    hours: (hours, sinceInstall) =>
      sinceInstall === null ? `${hours}h` : `${hours}h (${sinceInstall}h depuis l'installation)`,
    unknownHours: 'heures inconnues',
    wear: 'usure',
    stock: (stock, min) => `stock ${stock} (seuil ${min})`,
    purchasedOn: 'achetée le',
    dueDate: 'échéance',
    dueHours: (hours) => `à ${hours}h`,
    every: (months, engineHours) => {
      const intervals: string[] = []
      if (months !== null) intervals.push(`tous les ${months} mois`)
      if (engineHours !== null) intervals.push(`toutes les ${engineHours}h`)
      return intervals.join(' / ')
    },
    colon: ' : ',
  },
  en: {
    noneMasculine: 'None',
    noneFeminine: 'None',
    unknownFuel: 'unknown fuel',
    hours: (hours, sinceInstall) =>
      sinceInstall === null ? `${hours}h` : `${hours}h (${sinceInstall}h since installation)`,
    unknownHours: 'unknown hours',
    wear: 'wear',
    stock: (stock, min) => `stock ${stock} (threshold ${min})`,
    purchasedOn: 'purchased on',
    dueDate: 'due',
    dueHours: (hours) => `at ${hours}h`,
    every: (months, engineHours) => {
      const intervals: string[] = []
      if (months !== null) intervals.push(`every ${months} months`)
      if (engineHours !== null) intervals.push(`every ${engineHours}h`)
      return intervals.join(' / ')
    },
    colon: ': ',
  },
}

export function buildEngineSuggestionsUserMessage(
  input: EngineSuggestionsInput,
  locale: AiSuggestionLocale
): string {
  const { engine, parts, maintenanceTasks, maintenanceEvents, catalogOperations } = input
  const l = LABELS[locale]

  const hoursInfo =
    engine.hours === null
      ? l.unknownHours
      : l.hours(
          engine.hours,
          engine.installHours === null ? null : engine.hours - engine.installHours
        )

  const partsList =
    parts.length > 0
      ? parts
          .map((part) => {
            const details: string[] = []
            if (part.wearState) details.push(`${l.wear}${l.colon}${part.wearState}`)
            if (part.stock !== null && part.minStockAlert !== null) {
              details.push(l.stock(part.stock, part.minStockAlert))
            }
            if (part.purchasedAt) details.push(`${l.purchasedOn} ${part.purchasedAt}`)
            const reference = part.reference ? ` (${part.reference})` : ''
            return `- ${part.designation}${reference}${details.length > 0 ? ` — ${details.join(', ')}` : ''}`
          })
          .join('\n')
      : l.noneFeminine

  const openTasks = maintenanceTasks.filter((task) => task.status === 'open')
  const tasksList =
    openTasks.length > 0
      ? openTasks
          .map((task) => {
            const due: string[] = []
            if (task.dueAt) due.push(`${l.dueDate} ${task.dueAt}`)
            if (task.dueEngineHours !== null) due.push(l.dueHours(task.dueEngineHours))
            return `- ${task.title}${due.length > 0 ? ` — ${due.join(', ')}` : ''}`
          })
          .join('\n')
      : l.noneFeminine

  const eventsList =
    maintenanceEvents.length > 0
      ? maintenanceEvents
          .map((event) => `- ${event.performedAt}${l.colon}${event.title}`)
          .join('\n')
      : l.noneMasculine

  const catalogList =
    catalogOperations.length > 0
      ? catalogOperations
          .map(
            (operation) =>
              `- ${operation.label}${l.colon}${l.every(operation.intervalMonths, operation.intervalEngineHours)}`
          )
          .join('\n')
      : l.noneFeminine

  if (locale === 'en') {
    return `Analyze this boat engine and generate specific maintenance suggestions:

Engine: ${engine.kind} ${engine.brand ?? ''} ${engine.model ?? ''} (${engine.fuel ?? l.unknownFuel}${engine.powerHp !== null ? `, ${engine.powerHp}hp` : ''}${engine.manufacturedAt ? `, manufactured ${engine.manufacturedAt}` : ''})
Status: ${engine.status}, Hours: ${hoursInfo}

Parts:
${partsList}

Open maintenance tasks:
${tasksList}

Latest maintenance operations (5 max):
${eventsList}

Standard maintenance intervals for this engine family:
${catalogList}`
  }

  return `Analyse ce moteur de bateau et génère des suggestions de maintenance spécifiques :

Moteur : ${engine.kind} ${engine.brand ?? ''} ${engine.model ?? ''} (${engine.fuel ?? l.unknownFuel}${engine.powerHp !== null ? `, ${engine.powerHp}ch` : ''}${engine.manufacturedAt ? `, fabriqué le ${engine.manufacturedAt}` : ''})
Statut : ${engine.status}, Heures : ${hoursInfo}

Pièces :
${partsList}

Tâches de maintenance ouvertes :
${tasksList}

Dernières maintenances (5 max) :
${eventsList}

Intervalles d'entretien standard pour cette famille de moteur :
${catalogList}`
}
