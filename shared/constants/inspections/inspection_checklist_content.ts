import type { InspectionChecklistItem, InspectionChecklistSection } from '#shared/types/inspection'
import type { BoatCategory } from '#shared/types/boat_catalog'

/**
 * Corpus statique de la checklist d'état des lieux (#584), sur le modèle du
 * diagnostic panne (`shared/constants/diagnostic/diagnostic_content.ts`) : des
 * clés stables + des `labelKey` traduits dans les deux locales, jamais de texte
 * en dur.
 *
 * Les `key` des items sont persistées en base (`boat_inspection_items.item_key`)
 * et ne doivent JAMAIS être renommées ; on peut en insérer de nouvelles à
 * n'importe quelle position. Chaque clé est préfixée par la clé de sa section
 * (`<section>.<slug>`).
 *
 * La même checklist sert au check-out et au check-in : c'est la comparaison
 * point par point entre les deux qui a de la valeur.
 *
 * Le ciblage par catégorie (`categories`) s'appuie sur l'enum de #571
 * (`BOAT_CATEGORIES`) : pas de section « mât et gréement » sur une vedette, pas
 * d'« intérieur » sur un semi-rigide. Un item sans `categories` vaut pour tous
 * les bateaux, y compris ceux dont la catégorie est inconnue.
 */

/** Bateaux gréés — les seuls à voir la section « mât et gréement ». */
const SAIL: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'classic',
  'dinghy',
]

/** Bateaux avec un espace habitable (cabine, carré) — section « intérieur ». */
const CABIN: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'fishing',
  'houseboat',
  'classic',
]

/** Bateaux motorisés — tout sauf le dériveur, qui n'a pas de moteur. */
const MOTORIZED: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'open_dayboat',
  'fishing',
  'rib',
  'jetski',
  'houseboat',
  'tender',
  'classic',
  'workboat',
  'other',
]

/** Bateaux qui embarquent un mouillage — tout sauf le jet-ski et le dériveur. */
const WITH_GROUND_TACKLE: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'open_dayboat',
  'fishing',
  'rib',
  'houseboat',
  'tender',
  'classic',
  'workboat',
  'other',
]

/** Bateaux susceptibles d'embarquer une annexe. */
const TENDER_CARRIERS: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'houseboat',
  'classic',
]

/** Bateaux hauturiers dont l'armement compte un radeau de survie. */
const LIFERAFT_BOATS: readonly BoatCategory[] = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'classic',
]

function item(
  section: string,
  slug: string,
  categories?: readonly BoatCategory[]
): InspectionChecklistItem {
  return {
    key: `${section}.${slug}`,
    labelKey: `inspections.checklist.sections.${section}.items.${slug}`,
    ...(categories ? { categories } : {}),
  }
}

export const INSPECTION_CHECKLIST_SECTIONS: readonly InspectionChecklistSection[] = [
  {
    key: 'hull_deck',
    titleKey: 'inspections.checklist.sections.hull_deck.title',
    items: [
      item('hull_deck', 'hull_condition'),
      item('hull_deck', 'deck_condition'),
      item('hull_deck', 'fenders_lines'),
      item('hull_deck', 'windows_hatches', CABIN),
      item('hull_deck', 'anchor_windlass', WITH_GROUND_TACKLE),
    ],
  },
  {
    key: 'rigging',
    titleKey: 'inspections.checklist.sections.rigging.title',
    categories: SAIL,
    items: [
      item('rigging', 'mast_spars'),
      item('rigging', 'standing_rigging'),
      item('rigging', 'running_rigging'),
      item('rigging', 'sails_condition'),
      item('rigging', 'winches'),
    ],
  },
  {
    key: 'engine',
    titleKey: 'inspections.checklist.sections.engine.title',
    categories: MOTORIZED,
    items: [
      item('engine', 'engine_start'),
      item('engine', 'engine_oil'),
      item('engine', 'coolant'),
      item('engine', 'fuel_system'),
      item('engine', 'bilge'),
      item('engine', 'propeller'),
    ],
  },
  {
    key: 'electrical',
    titleKey: 'inspections.checklist.sections.electrical.title',
    items: [
      item('electrical', 'batteries'),
      item('electrical', 'navigation_lights'),
      item('electrical', 'electronics'),
      item('electrical', 'shore_power', CABIN),
    ],
  },
  {
    key: 'safety',
    titleKey: 'inspections.checklist.sections.safety.title',
    items: [
      item('safety', 'lifejackets'),
      item('safety', 'extinguishers'),
      item('safety', 'flares'),
      item('safety', 'first_aid'),
      item('safety', 'liferaft', LIFERAFT_BOATS),
    ],
  },
  {
    key: 'interior',
    titleKey: 'inspections.checklist.sections.interior.title',
    categories: CABIN,
    items: [
      item('interior', 'cabin_condition'),
      item('interior', 'galley'),
      item('interior', 'heads'),
      item('interior', 'water_system'),
      item('interior', 'cleanliness'),
    ],
  },
  {
    key: 'tender',
    titleKey: 'inspections.checklist.sections.tender.title',
    categories: TENDER_CARRIERS,
    items: [
      item('tender', 'tender_condition'),
      item('tender', 'tender_outboard'),
      item('tender', 'accessories'),
    ],
  },
]

/**
 * Index des clés persistables, pour la validation serveur du `item_key` — même
 * mécanique que `ALL_DIAGNOSTIC_STEP_KEYS`.
 */
export const ALL_INSPECTION_ITEM_KEYS: ReadonlySet<string> = new Set(
  INSPECTION_CHECKLIST_SECTIONS.flatMap((section) => section.items.map((entry) => entry.key))
)
