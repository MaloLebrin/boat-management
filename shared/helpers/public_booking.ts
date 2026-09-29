import type { PublicBusyRange, PublicBookingSelection } from '#shared/types/public_booking'

/**
 * Helpers de la page publique de réservation (#881), partagés entre le
 * serveur (qui refuse une demande sur un jour occupé) et le calendrier de la
 * page (qui ne laisse pas la sélectionner). Toutes les dates sont des jours
 * `YYYY-MM-DD` : leur ordre lexicographique est l'ordre chronologique.
 */

/** Trie et fusionne les plages qui se chevauchent ou se touchent. */
export function mergeBusyRanges(ranges: PublicBusyRange[]): PublicBusyRange[] {
  const sorted = ranges
    .filter((range) => range.startsOn < range.endsOn)
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0))

  const merged: PublicBusyRange[] = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range.startsOn <= last.endsOn) {
      if (range.endsOn > last.endsOn) last.endsOn = range.endsOn
      continue
    }
    merged.push({ ...range })
  }
  return merged
}

/** Le jour `day` tombe-t-il dans une plage occupée ? */
export function isDayBusy(day: string, busy: PublicBusyRange[]): boolean {
  return busy.some((range) => range.startsOn <= day && day < range.endsOn)
}

/**
 * La sélection `[startsOn, endsOn[` chevauche-t-elle une plage occupée ? Le
 * jour du départ n'est pas occupé par la location : une arrivée peut le suivre
 * le même jour.
 */
export function selectionOverlapsBusy(
  selection: PublicBookingSelection,
  busy: PublicBusyRange[]
): boolean {
  return busy.some(
    (range) => range.startsOn < selection.endsOn && range.endsOn > selection.startsOn
  )
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Forme `YYYY-MM-DD` d'une date du calendrier — le reste est rejeté sans lever. */
export function isDayString(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Sélection en cours sur le calendrier : l'arrivée d'abord, le départ ensuite. */
export interface PublicBookingDraft {
  startsOn: string
  endsOn: string | null
}

/**
 * Le jour peut-il être cliqué ? Une arrivée tombe sur un jour libre ; un
 * départ peut tomber sur un jour occupé (le client rend le bateau le matin où
 * le suivant le prend), pourvu qu'aucun jour occupé ne sépare les deux. Un
 * jour libre au-delà d'un créneau occupé reste cliquable : il repose l'arrivée.
 */
export function canPickDay(
  day: string,
  draft: PublicBookingDraft | null,
  busy: PublicBusyRange[],
  window: { from: string; until: string }
): boolean {
  if (day < window.from || day > window.until) return false
  if (
    draft &&
    draft.endsOn === null &&
    day > draft.startsOn &&
    !selectionOverlapsBusy({ startsOn: draft.startsOn, endsOn: day }, busy)
  ) {
    return true
  }
  // Sinon, le clic pose (ou repose) une arrivée : jour libre, et pas le
  // dernier jour de la fenêtre, qui ne laisserait aucun départ possible.
  return day < window.until && !isDayBusy(day, busy)
}

/**
 * Sélection après un clic sur `day` (déjà autorisé par `canPickDay`) : un
 * premier clic pose l'arrivée, un second après elle pose le départ ; un clic
 * avant l'arrivée, ou sur une sélection complète, recommence.
 */
export function nextDraft(
  day: string,
  draft: PublicBookingDraft | null,
  busy: PublicBusyRange[]
): PublicBookingDraft {
  if (
    draft &&
    draft.endsOn === null &&
    day > draft.startsOn &&
    !selectionOverlapsBusy({ startsOn: draft.startsOn, endsOn: day }, busy)
  ) {
    return { startsOn: draft.startsOn, endsOn: day }
  }
  return { startsOn: day, endsOn: null }
}
