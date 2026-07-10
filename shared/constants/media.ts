export const MEDIA_ENTITY_TYPES = [
  'boat',
  'boat_engine',
  'boat_engine_part',
  'boat_sail',
  'boat_rig',
  'boat_generic_equipment',
  'boat_safety_equipment',
  'boat_maintenance_event',
  'boat_document',
  'inspection',
  'rentalContract',
  'client',
  'user',
] as const

export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number]

export const MEDIA_KINDS = ['photo', 'document'] as const

export type MediaKind = (typeof MEDIA_KINDS)[number]
