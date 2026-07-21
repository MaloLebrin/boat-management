import type { MaintenanceEventRow } from '~/types/boat_show'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

type T = (key: string) => string

export function subjectLabel(t: T, s: string) {
  return maintenanceSubjectLabel(t, s) ?? s
}

export function performedDisplay(iso: string) {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d || iso
}

/**
 * Extra caption shown alongside the subject label (e.g. "Yamaha 8HP" for an
 * engine). Returns null when the subject has no more specific caption to add,
 * so callers can skip the redundant "· <same label>" segment.
 */
export function targetDescription(ev: MaintenanceEventRow): string | null {
  if (ev.subject === 'engine') return ev.engineCaption
  if (ev.subject === 'sail') return ev.sailCaption
  return null
}
