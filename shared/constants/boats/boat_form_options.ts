/** Single source for boat form select options (labels + values). */

export const PROPULSION_OPTIONS = [
  { value: 'sailboat', label: 'Sailboat' },
  { value: 'motorboat', label: 'Motorboat' },
  { value: 'catamaran', label: 'Catamaran' },
  { value: 'rib', label: 'RIB' },
  { value: 'other', label: 'Other' },
] as const

export const HULL_MATERIAL_OPTIONS = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'steel', label: 'Steel' },
  { value: 'wood', label: 'Wood' },
  { value: 'carbon', label: 'Carbon' },
  { value: 'other', label: 'Other' },
] as const

export const ENGINE_KIND_OPTIONS = [
  { value: 'inboard', label: 'Inboard' },
  { value: 'outboard', label: 'Outboard' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'other', label: 'Other' },
] as const

export const ENGINE_FUEL_OPTIONS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'essence', label: 'Essence' },
  { value: 'electric', label: 'Electric' },
  { value: 'other', label: 'Other' },
] as const

export const ENGINE_STROKE_TYPE_OPTIONS = [
  { value: '2_stroke', label: '2-stroke' },
  { value: '4_stroke', label: '4-stroke' },
] as const

export const SAIL_TYPE_OPTIONS = [
  { value: 'main', label: 'Main' },
  { value: 'genoa', label: 'Genoa' },
  { value: 'jib', label: 'Jib' },
  { value: 'spinnaker', label: 'Spinnaker' },
  { value: 'gennaker', label: 'Gennaker' },
  { value: 'storm_jib', label: 'Storm jib' },
  { value: 'other', label: 'Other' },
] as const

export const RIG_TYPE_OPTIONS = [
  { value: 'sloop', label: 'Sloop' },
  { value: 'cutter', label: 'Cutter' },
  { value: 'ketch', label: 'Ketch' },
  { value: 'yawl', label: 'Yawl' },
  { value: 'schooner', label: 'Schooner' },
  { value: 'cat_rig', label: 'Cat rig' },
  { value: 'other', label: 'Other' },
] as const
