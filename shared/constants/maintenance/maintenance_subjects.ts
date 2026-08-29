/** Single source for maintenance/planning subject enum values. */

export const MAINTENANCE_SUBJECTS = [
  'boat',
  'hull',
  'engine',
  'sail',
  'rig',
  'electrical',
  'plumbing',
  'safety',
  'deck',
  'other',
] as const

export type MaintenanceSubject = (typeof MAINTENANCE_SUBJECTS)[number]

export const MAINTENANCE_SUBJECT_OPTIONS: ReadonlyArray<{
  value: MaintenanceSubject
  label: string
}> = [
  { value: 'boat', label: 'Boat' },
  { value: 'hull', label: 'Hull' },
  { value: 'engine', label: 'Engine' },
  { value: 'sail', label: 'Sail' },
  { value: 'rig', label: 'Rig' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'safety', label: 'Safety' },
  { value: 'deck', label: 'Deck' },
  { value: 'other', label: 'Other' },
]
