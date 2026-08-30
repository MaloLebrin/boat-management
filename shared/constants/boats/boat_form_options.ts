/** Single source for boat form select options (labels + values). */

/**
 * Catégories de bateau (#571) — vocabulaire fermé qui remplace le champ texte
 * libre `type` dans le formulaire. Les libellés ci-dessous sont un repli EN :
 * l'affichage passe par `t('boats.options.category.<slug>')`.
 *
 * Rien à voir avec `NAVIGATION_CATEGORY_OPTIONS` (catégorie CE A/B/C/D).
 */
export const BOAT_CATEGORY_OPTIONS = [
  { value: 'sailboat_monohull', label: 'Monohull sailboat' },
  { value: 'sailboat_multihull', label: 'Sailing multihull' },
  { value: 'motor_yacht', label: 'Motor yacht' },
  { value: 'power_catamaran', label: 'Power catamaran' },
  { value: 'trawler', label: 'Trawler' },
  { value: 'open_dayboat', label: 'Open / day boat' },
  { value: 'fishing', label: 'Fishing boat' },
  { value: 'rib', label: 'RIB' },
  { value: 'jetski', label: 'Personal watercraft' },
  { value: 'houseboat', label: 'Houseboat / canal boat' },
  { value: 'dinghy', label: 'Dinghy' },
  { value: 'tender', label: 'Tender' },
  { value: 'classic', label: 'Classic boat' },
  { value: 'workboat', label: 'Workboat' },
  { value: 'other', label: 'Other' },
] as const

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

/**
 * Familles de motorisation (#574) — moteur **et** transmission, `boat_engines.family`.
 * Les libellés ci-dessous sont un repli EN : l'affichage passe par
 * `t('boats.options.engineFamily.<slug>')`.
 *
 * Rien à voir avec `ENGINE_KIND_OPTIONS` (`kind`, qui reste saisi) ni avec les
 * familles du catalogue moteur (`ENGINE_CATALOG_FAMILIES`, #573), qui classent
 * des gammes de modèles. La liste et l'ordre suivent `ENGINE_FAMILIES` —
 * `tests/inertia/boat_form_options.spec.ts` le vérifie.
 */
export const BOAT_ENGINE_FAMILY_OPTIONS = [
  { value: 'outboard_2t', label: '2-stroke outboard' },
  { value: 'outboard_4t', label: '4-stroke outboard' },
  { value: 'inboard_diesel_shaft', label: 'Diesel inboard, shaft drive' },
  { value: 'inboard_diesel_saildrive', label: 'Diesel inboard, sail drive' },
  { value: 'inboard_petrol', label: 'Petrol inboard' },
  { value: 'sterndrive', label: 'Sterndrive' },
  { value: 'pod_drive', label: 'Pod drive' },
  { value: 'jet', label: 'Jet drive' },
  { value: 'electric_outboard', label: 'Electric outboard' },
  { value: 'electric_inboard', label: 'Electric inboard' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'generator', label: 'Marine generator' },
  { value: 'other', label: 'Other' },
] as const

/**
 * Vocabulaire des carburants — porté par le moteur (`boat_engines.fuel`) et,
 * depuis #585, par le plein lui-même (`boat_fuel_logs.fuel_type`).
 */
export const ENGINE_FUELS = ['diesel', 'essence', 'electric', 'other'] as const
export type EngineFuel = (typeof ENGINE_FUELS)[number]

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

/**
 * Matériaux de voile (#578) — vocabulaire fermé (`SAIL_MATERIALS`) qui remplace
 * le texte libre de `boat_sails.material`. Les libellés ci-dessous sont un
 * repli EN : l'affichage passe par `t('boats.options.sailMaterial.<slug>')`.
 * La liste et l'ordre suivent `SAIL_MATERIALS` — vérifié par test.
 */
export const SAIL_MATERIAL_OPTIONS = [
  { value: 'dacron', label: 'Dacron (woven polyester)' },
  { value: 'laminate', label: 'Laminate (Mylar/Pentex)' },
  { value: 'hydranet', label: 'Hydra Net' },
  { value: 'membrane', label: 'Membrane (3Di, DFi, carbon/aramid)' },
  { value: 'nylon_spi', label: 'Nylon (spinnaker)' },
  { value: 'cuben', label: 'Cuben / Ultra PE' },
  { value: 'other', label: 'Other' },
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

export const NAVIGATION_CATEGORY_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
] as const

export const SAFETY_EQUIPMENT_TYPE_OPTIONS = [
  { value: 'life_jacket', label: 'Life jacket' },
  { value: 'life_raft', label: 'Life raft' },
  { value: 'fire_extinguisher', label: 'Fire extinguisher' },
  { value: 'vhf_radio', label: 'VHF radio' },
  { value: 'flare', label: 'Flare / distress signal' },
  { value: 'epirb', label: 'EPIRB / PLB' },
  { value: 'first_aid_kit', label: 'First aid kit' },
  { value: 'harness', label: 'Safety harness' },
  { value: 'lifebuoy', label: 'Lifebuoy' },
  { value: 'anchor', label: 'Anchor' },
  { value: 'bilge_pump', label: 'Bilge pump' },
  { value: 'compass', label: 'Compass' },
  { value: 'ais', label: 'AIS transponder' },
  { value: 'gps', label: 'GPS / chartplotter' },
  { value: 'radar', label: 'Radar' },
  { value: 'other', label: 'Other' },
] as const

export const SAFETY_EQUIPMENT_STATUS_OPTIONS = [
  { value: 'ok', label: 'OK' },
  { value: 'to_check', label: 'To check' },
  { value: 'expired', label: 'Expired' },
] as const

export const GENERIC_EQUIPMENT_STATUS_OPTIONS = [
  { value: 'ok', label: 'OK' },
  { value: 'to_check', label: 'To check' },
  { value: 'to_replace', label: 'To replace' },
] as const

/**
 * Catégories d'équipement générique (#577) — liste et ordre alignés sur
 * `GENERIC_EQUIPMENT_CATEGORIES` (`shared/types/boat.ts`), la constante que le
 * validator suit. Les libellés ci-dessous sont un repli EN : l'affichage passe
 * par `t('boats.options.genericEquipmentCategory.<slug>')`.
 */
export const GENERIC_EQUIPMENT_CATEGORY_OPTIONS = [
  { value: 'navigation', label: 'Navigation electronics' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'anchoring', label: 'Anchoring' },
  { value: 'deck', label: 'Deck hardware' },
  { value: 'energy', label: 'Energy & heating' },
  { value: 'comfort', label: 'Comfort & living' },
  { value: 'plumbing', label: 'Plumbing & water' },
] as const
