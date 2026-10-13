import { normalizeHelpText } from '#shared/helpers/product_help_search'
import type { FuelLogRow } from '#shared/types/fuel_log'
import type { BoatIncidentRow } from '#shared/types/incident'
import type { NavigationLogRow } from '#shared/types/navigation_log'
import type { BoatShowEngine, MaintenanceTaskRow } from '~/types/boat_show'

/**
 * Contexte du bateau pour l'assistant hors-ligne (#982, épic #949).
 *
 * Logique pure : reconnaître une question factuelle sur le bateau et en tirer
 * les lignes utiles depuis les props de la fiche mises en cache par « Préparer
 * la traversée » (#967). Pas de modèle — le spike #972 l'écarte : la valeur
 * vient des données. La lecture des caches vit dans `offline_boat_cache.ts`.
 */

export type OfflineBoatIntent = 'maintenance' | 'incidents' | 'fuel' | 'engineHours' | 'logbook'

/**
 * Mots-clés normalisés (minuscules, sans accents), testés dans cet ordre : la
 * première intention reconnue l'emporte. « Heures moteur de la prochaine
 * vidange » parle d'entretien, « heures moteur au dernier plein » de carburant.
 */
const INTENT_PATTERNS: Array<[OfflineBoatIntent, RegExp]> = [
  [
    'maintenance',
    /\b(entretiens?|echeances?|maintenance|vidanges?|revisions?|taches?|a faire|upcoming|due|servicing|tasks?)\b/,
  ],
  ['incidents', /\b(incidents?|avaries?|sinistres?|damages?)\b/],
  [
    'fuel',
    /\b(carburant|pleins?|gasoil|gazole|diesel|essence|avitaillements?|fuel|refuel\w*|cuves?|reservoirs?|tanks?)\b/,
  ],
  [
    'engineHours',
    /\b(heures? (du |des )?moteurs?|compteurs?|horametre|combien d heures|engine hours?|hour meter|how many hours)\b/,
  ],
  ['logbook', /\b(journal|livre de bord|logbook|sorties?|derniere navigation|trips?|last sail)\b/],
]

/**
 * Une question « comment faire » relève de l'aide produit (#971), même quand
 * elle parle de carburant ou d'incident : « comment saisir un plein ».
 */
const HOW_TO_PATTERN =
  /\b(comment|ou (trouver|est|sont|se trouve)|ajouter|saisir|creer|declarer|enregistrer|modifier|supprimer|pourquoi|qu est ce|how|where|add|create|record|edit|delete|why|what is)\b/

const FUEL_LEVEL_PATTERN = /\b(niveau|reste|restant|jauge|level|left|remaining|gauge)\b/

export function detectOfflineBoatIntent(question: string): OfflineBoatIntent | null {
  const text = normalizeHelpText(question).replace(/[^a-z0-9]+/g, ' ')
  if (HOW_TO_PATTERN.test(text)) return null
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(text)) return intent
  }
  return null
}

/** Le niveau de la cuve n'est relevé que par les états des lieux, pas sur la fiche. */
export function asksFuelLevel(question: string): boolean {
  return FUEL_LEVEL_PATTERN.test(normalizeHelpText(question).replace(/[^a-z0-9]+/g, ' '))
}

/** Bateau de la page courante : la fiche et toutes ses sous-pages (`/boats/7/engines/3/…`). */
export function boatIdFromPageUrl(pageUrl: string): number | null {
  const match = /^\/boats\/(\d+)(?:[/?#]|$)/.exec(pageUrl)
  return match ? Number(match[1]) : null
}

export interface CachedBoat {
  id: number
  name: string
}

/** Bateau nommé dans la question (« et pour Ylang ? ») — le plus long nom gagne. */
export function mentionedBoatId(question: string, boats: readonly CachedBoat[]): number | null {
  const text = ` ${normalizeHelpText(question).replace(/[^a-z0-9]+/g, ' ')} `
  const named = boats
    .map((boat) => ({
      id: boat.id,
      name: normalizeHelpText(boat.name)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
    }))
    .filter((boat) => boat.name.length > 0 && text.includes(` ${boat.name} `))
    .sort((a, b) => b.name.length - a.name.length)
  return named[0]?.id ?? null
}

export interface InertiaPagePayload {
  component: string
  props: Record<string, unknown>
}

function asPage(raw: string | null | undefined): InertiaPagePayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<InertiaPagePayload>
    if (typeof parsed.component !== 'string' || !parsed.props) return null
    return { component: parsed.component, props: parsed.props }
  } catch {
    return null
  }
}

/**
 * Objet page d'un document Inertia en cache : `<script data-page>` (option
 * `useScriptElementForInitialPage`) ou attribut `data-page` du conteneur.
 */
export function readInertiaPageFromHtml(html: string): InertiaPagePayload | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const script = doc.querySelector('script[data-page]')
  if (script) return asPage(script.textContent)
  return asPage(doc.querySelector('[data-page]')?.getAttribute('data-page'))
}

/** Un jeu de props et la date de la réponse qui l'a apporté. */
export interface OfflineSection<T> {
  rows: T
  cachedAt: Date | null
}

export interface OfflineBoatSnapshot {
  boatId: number
  boatName: string
  /** Date du document de la fiche : celle des moteurs. */
  cachedAt: Date | null
  engines: BoatShowEngine[]
  /** Props différées (#463) : absentes si leur groupe n'a pas été mis en cache. */
  maintenanceTasks: OfflineSection<MaintenanceTaskRow[]> | null
  fuelLogs: OfflineSection<FuelLogRow[]> | null
  incidents: OfflineSection<BoatIncidentRow[]> | null
  navigationLogs: OfflineSection<NavigationLogRow[]> | null
}

export const OFFLINE_ANSWER_MAX_ROWS = 3

/**
 * Échéances ouvertes, la plus proche d'abord ; une tâche datée passe avant
 * une tâche à l'horamètre, qu'on ne sait pas convertir en date.
 */
export function upcomingTasks(tasks: readonly MaintenanceTaskRow[]): MaintenanceTaskRow[] {
  return tasks
    .filter(
      (task) => task.status === 'open' && (task.dueAt !== null || task.dueEngineHours !== null)
    )
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt)
      if (a.dueAt) return -1
      if (b.dueAt) return 1
      return (a.dueEngineHours ?? 0) - (b.dueEngineHours ?? 0)
    })
}

/** Moteurs encore en service : un moteur retiré n'a plus d'heures à lire. */
export function activeEngines(engines: readonly BoatShowEngine[]): BoatShowEngine[] {
  return engines.filter((engine) => engine.status !== 'retired')
}

export function latestFuelLog(logs: readonly FuelLogRow[]): FuelLogRow | null {
  return [...logs].sort((a, b) => b.fueledAt.localeCompare(a.fueledAt))[0] ?? null
}

/** Incidents ouverts ou en cours, le plus récent d'abord. */
export function openIncidents(incidents: readonly BoatIncidentRow[]): BoatIncidentRow[] {
  return incidents
    .filter((incident) => incident.status !== 'closed')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function latestNavigationLog(logs: readonly NavigationLogRow[]): NavigationLogRow | null {
  return [...logs].sort((a, b) => b.departedAt.localeCompare(a.departedAt))[0] ?? null
}
