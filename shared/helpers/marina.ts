import { MOORING_PERIOD_MONTHS, MOORING_RENEWAL_NOTICE_DAYS } from '../constants/marina.js'
import type { MarinaStayService, MooringContractPeriodicity } from '../types/marina.js'
import type { SpotEffectiveStatus, SpotStatus } from '../types/spot.js'

/**
 * Calculs purs de l'exploitation marina (#891), partagés serveur ↔ écran.
 * Les dates sont des chaînes `YYYY-MM-DD` : on compte des **nuits**, pas des
 * heures, et un fuseau ne doit pas déplacer une nuitée.
 */

const DAY_MS = 86_400_000

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Nuitées entre l'arrivée et le départ (le jour du départ ne compte pas). */
export function stayNights(arrivalOn: string, departureOn: string): number {
  return Math.max(0, Math.round((toUtcMs(departureOn) - toUtcMs(arrivalOn)) / DAY_MS))
}

/**
 * Nuitées d'un séjour `[start, end)` comprises dans la période `[from, to)`.
 * `end` absent : séjour ouvert, borné par la fin de période.
 */
export function overlapNights(start: string, end: string | null, from: string, to: string): number {
  const lo = Math.max(toUtcMs(start), toUtcMs(from))
  const hi = Math.min(end === null ? toUtcMs(to) : toUtcMs(end), toUtcMs(to))
  return Math.max(0, Math.round((hi - lo) / DAY_MS))
}

/** Taux en pourcentage entier, `0` sur une capacité nulle, plafonné à 100. */
export function occupancyRate(occupiedNights: number, spots: number, nights: number): number {
  const capacity = spots * nights
  if (capacity <= 0) return 0
  return Math.min(100, Math.round((occupiedNights / capacity) * 100))
}

/** Montant HT d'une escale : nuitées × tarif + services. Arrondi au centime. */
export function stayTotal(nights: number, nightlyRate: number, services: MarinaStayService[]) {
  const extras = services.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  return Math.round((nights * nightlyRate + extras) * 100) / 100
}

/**
 * Une place accueille-t-elle un bateau de cette longueur ? Une dimension
 * inconnue d'un côté ou de l'autre ne permet pas de conclure : `null`.
 */
export function spotFitsLength(spotLengthM: number | null, boatLengthM: number | null) {
  if (spotLengthM === null || boatLengthM === null) return null
  return boatLengthM <= spotLengthM
}

/** Statut affiché : le statut saisi, sauf si un bateau occupe la place. */
export function spotEffectiveStatus(status: SpotStatus, occupied: boolean): SpotEffectiveStatus {
  if (status === 'out_of_service') return 'out_of_service'
  return occupied ? 'occupied' : status
}

/**
 * Échéance suivante : on avance de N mois en gardant le jour, ramené au
 * dernier jour du mois quand il n'existe pas (31 janvier → 28/29 février).
 * On part toujours de la date d'**ancrage** (début du contrat) pour ne pas
 * dériver d'un mois court au suivant.
 */
export function addPeriods(
  anchorOn: string,
  periodicity: MooringContractPeriodicity,
  count: number
): string {
  const [y, m, d] = anchorOn.split('-').map(Number)
  const totalMonths = m! - 1 + MOORING_PERIOD_MONTHS[periodicity] * count
  const year = y! + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return fromUtcMs(Date.UTC(year, month, Math.min(d!, lastDay)))
}

/** Veille d'une date ISO — fin incluse d'une période facturée. */
export function previousDay(isoDate: string): string {
  return fromUtcMs(toUtcMs(isoDate) - DAY_MS)
}

/** Contrat à renouveler : fin connue, pas encore passée, dans le délai de préavis. */
export function contractRenewalDue(endsOn: string | null, today: string): boolean {
  if (endsOn === null) return false
  const days = Math.round((toUtcMs(endsOn) - toUtcMs(today)) / DAY_MS)
  return days >= 0 && days <= MOORING_RENEWAL_NOTICE_DAYS
}
