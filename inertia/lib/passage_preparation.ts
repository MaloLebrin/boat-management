import { SESSION_IDLE_DAYS } from '../../shared/constants/auth'

/**
 * « Préparer la traversée » (#967, épic #949) — logique pure de l'écran :
 * pages à pré-charger et évaluation de la check-list. Le composable
 * `use_passage_preparation.ts` y branche le service worker et les caches.
 */

export type PassagePageKey =
  | 'boat'
  | 'navigationLogs'
  | 'sheets'
  | 'fuel'
  | 'incidents'
  | 'planning'

export interface PassagePage {
  key: PassagePageKey
  /** Chemin relatif, tel que la navigation le demandera hors-ligne. */
  url: string
}

/**
 * Pages terrain d'un bateau. Les onglets de la fiche sont des URLs distinctes
 * pour le cache des documents (`?tab=` est conservé par un rechargement) :
 * chacune est pré-chargée. Leurs props différées, elles, sont communes.
 */
export function passagePages(boatId: number): PassagePage[] {
  const boat = `/boats/${boatId}`
  return [
    { key: 'boat', url: boat },
    { key: 'navigationLogs', url: `${boat}?tab=navigation-logs` },
    { key: 'sheets', url: `${boat}?tab=sheets` },
    { key: 'fuel', url: `${boat}?tab=fuel` },
    { key: 'incidents', url: `${boat}?tab=incidents` },
    { key: 'planning', url: '/planning' },
  ]
}

export type ChecklistStatus = 'ok' | 'warning' | 'unknown'

export interface PassageChecklistInput {
  /** `null` : pas encore demandé sur ce chargement de page. */
  persisted: boolean | null
  estimate: { usage: number; quota: number } | null
  /** Pages en cache et date de leur copie (`null` : absente). */
  cachedAt: Array<Date | null>
  pendingCount: number
  failedCount: number
  /** Date de retour saisie (`YYYY-MM-DD`), vide si non renseignée. */
  returnDate: string
  today: Date
}

export interface PassageChecklist {
  storage: ChecklistStatus
  quota: ChecklistStatus
  pages: ChecklistStatus
  queue: ChecklistStatus
  session: ChecklistStatus
  /** Jours entre aujourd'hui et la date de retour, `null` si non renseignée. */
  daysUntilReturn: number | null
}

/** En dessous, une semaine de photos et de saisies risque de ne plus tenir. */
export const MIN_FREE_BYTES = 50 * 1024 * 1024

const DAY_MS = 24 * 3600 * 1000

function daysBetween(from: Date, isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return null
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((target - start) / DAY_MS)
}

export function evaluatePassageChecklist(input: PassageChecklistInput): PassageChecklist {
  const daysUntilReturn = input.returnDate ? daysBetween(input.today, input.returnDate) : null

  let quota: ChecklistStatus = 'unknown'
  if (input.estimate && input.estimate.quota > 0) {
    quota = input.estimate.quota - input.estimate.usage >= MIN_FREE_BYTES ? 'ok' : 'warning'
  }

  let pages: ChecklistStatus = 'warning'
  if (input.cachedAt.length > 0 && input.cachedAt.every((date) => date !== null)) pages = 'ok'

  // La session glisse : chaque requête la prolonge de SESSION_IDLE_DAYS.
  // Sans activité réseau pendant la traversée, elle tombe à J+30 ; au-delà,
  // seul le remember-me (#951) évite la reconnexion — illisible côté client
  // (cookie httpOnly), d'où un avertissement plutôt qu'un échec.
  let session: ChecklistStatus = 'unknown'
  if (daysUntilReturn !== null) session = daysUntilReturn <= SESSION_IDLE_DAYS ? 'ok' : 'warning'

  return {
    storage: input.persisted === null ? 'unknown' : input.persisted ? 'ok' : 'warning',
    quota,
    pages,
    queue: input.pendingCount === 0 && input.failedCount === 0 ? 'ok' : 'warning',
    session,
    daysUntilReturn,
  }
}
