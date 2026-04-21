import type { MaintenanceEventRow } from '~/types/boat_show'

export function subjectLabel(s: string) {
  switch (s) {
    case 'boat':
      return 'Boat'
    case 'engine':
      return 'Engine'
    case 'sail':
      return 'Sail'
    case 'rig':
      return 'Rig'
    default:
      return s
  }
}

export function performedDisplay(iso: string) {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d || iso
}

export function targetDescription(ev: MaintenanceEventRow) {
  if (ev.subject === 'boat') return 'Whole boat'
  if (ev.subject === 'engine') return ev.engineCaption ?? 'Engine'
  if (ev.subject === 'sail') return ev.sailCaption ?? 'Sail'
  if (ev.subject === 'rig') return 'Rig'
  return '—'
}
