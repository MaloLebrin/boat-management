import type { MaintenanceEventRow } from '~/types/boat_show'

export function subjectLabel(s: string) {
  switch (s) {
    case 'boat':
      return 'Boat'
    case 'hull':
      return 'Hull'
    case 'engine':
      return 'Engine'
    case 'sail':
      return 'Sail'
    case 'rig':
      return 'Rig'
    case 'electrical':
      return 'Electrical'
    case 'plumbing':
      return 'Plumbing'
    case 'safety':
      return 'Safety'
    case 'deck':
      return 'Deck'
    case 'other':
      return 'Other'
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
  if (ev.subject === 'hull') return 'Hull'
  if (ev.subject === 'engine') return ev.engineCaption ?? 'Engine'
  if (ev.subject === 'sail') return ev.sailCaption ?? 'Sail'
  if (ev.subject === 'rig') return 'Rig'
  if (ev.subject === 'electrical') return 'Electrical'
  if (ev.subject === 'plumbing') return 'Plumbing'
  if (ev.subject === 'safety') return 'Safety'
  if (ev.subject === 'deck') return 'Deck'
  if (ev.subject === 'other') return 'Other'
  return '—'
}
