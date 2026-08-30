import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import {
  ALL_INSPECTION_ITEM_KEYS,
  INSPECTION_CHECKLIST_SECTIONS,
} from '../../shared/constants/inspections/inspection_checklist_content'
import {
  findInspectionChecklistItem,
  inspectionCategoryForBoat,
  inspectionItemCountForCategory,
  inspectionSectionsForCategory,
} from '../../shared/helpers/inspection_checklist'
import { BOAT_CATEGORIES } from '../../shared/types/boat_catalog'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeKeys(locale: 'en' | 'fr'): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, 'inspections.json'))
  return new Set(flattenKeys(JSON.parse(raw.toString()), 'inspections'))
}

/**
 * Toutes les clés d'items du corpus initial de #584. Elles sont persistées dans
 * `boat_inspection_items.item_key` : en renommer une ferait silencieusement
 * disparaître les constats déjà enregistrés de tous les états des lieux. On
 * peut en AJOUTER, jamais en renommer ni en retirer de cette liste.
 */
const INITIAL_ITEM_KEYS = [
  'electrical.batteries',
  'electrical.electronics',
  'electrical.navigation_lights',
  'electrical.shore_power',
  'engine.bilge',
  'engine.coolant',
  'engine.engine_oil',
  'engine.engine_start',
  'engine.fuel_system',
  'engine.propeller',
  'hull_deck.anchor_windlass',
  'hull_deck.deck_condition',
  'hull_deck.fenders_lines',
  'hull_deck.hull_condition',
  'hull_deck.windows_hatches',
  'interior.cabin_condition',
  'interior.cleanliness',
  'interior.galley',
  'interior.heads',
  'interior.water_system',
  'rigging.mast_spars',
  'rigging.running_rigging',
  'rigging.sails_condition',
  'rigging.standing_rigging',
  'rigging.winches',
  'safety.extinguishers',
  'safety.first_aid',
  'safety.flares',
  'safety.lifejackets',
  'safety.liferaft',
  'tender.accessories',
  'tender.tender_condition',
  'tender.tender_outboard',
] as const

describe('inspection checklist corpus invariants (#584)', () => {
  test('every item key is prefixed by its section key', () => {
    for (const section of INSPECTION_CHECKLIST_SECTIONS) {
      for (const item of section.items) {
        expect(item.key.startsWith(`${section.key}.`)).toBe(true)
      }
    }
  })

  test('no duplicate item keys across the whole corpus', () => {
    const keys = INSPECTION_CHECKLIST_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.key)
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('no duplicate section keys', () => {
    const keys = INSPECTION_CHECKLIST_SECTIONS.map((section) => section.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('the initial persisted keys are all still present (never rename)', () => {
    for (const key of INITIAL_ITEM_KEYS) {
      expect(ALL_INSPECTION_ITEM_KEYS.has(key), `missing persisted key ${key}`).toBe(true)
    }
  })

  test('declared categories all belong to the #571 vocabulary and are never empty', () => {
    const known = new Set<string>(BOAT_CATEGORIES)
    for (const section of INSPECTION_CHECKLIST_SECTIONS) {
      if (section.categories) {
        expect(section.categories.length).toBeGreaterThan(0)
        for (const category of section.categories) expect(known.has(category)).toBe(true)
      }
      for (const item of section.items) {
        if (item.categories) {
          expect(item.categories.length).toBeGreaterThan(0)
          for (const category of item.categories) expect(known.has(category)).toBe(true)
        }
      }
    }
  })

  test('every content key exists in both locales', () => {
    for (const locale of ['en', 'fr'] as const) {
      const keys = localeKeys(locale)
      for (const section of INSPECTION_CHECKLIST_SECTIONS) {
        expect(keys.has(section.titleKey), `${locale}: ${section.titleKey}`).toBe(true)
        for (const item of section.items) {
          expect(keys.has(item.labelKey), `${locale}: ${item.labelKey}`).toBe(true)
        }
      }
    }
  })
})

describe('inspection checklist filtering by boat category', () => {
  test('a motor yacht gets no rigging section', () => {
    const sections = inspectionSectionsForCategory('motor_yacht')
    expect(sections.some((section) => section.key === 'rigging')).toBe(false)
    expect(sections.some((section) => section.key === 'engine')).toBe(true)
  })

  test('a RIB gets neither interior nor rigging nor tender', () => {
    const keys = inspectionSectionsForCategory('rib').map((section) => section.key)
    expect(keys).not.toContain('interior')
    expect(keys).not.toContain('rigging')
    expect(keys).not.toContain('tender')
    expect(keys).toContain('safety')
  })

  test('a monohull sailboat gets the full sail-oriented checklist', () => {
    const keys = inspectionSectionsForCategory('sailboat_monohull').map((section) => section.key)
    expect(keys).toContain('rigging')
    expect(keys).toContain('interior')
    expect(keys).toContain('tender')
  })

  test('items are filtered inside a kept section', () => {
    const hullDeck = inspectionSectionsForCategory('rib').find(
      (section) => section.key === 'hull_deck'
    )
    expect(hullDeck).toBeDefined()
    expect(hullDeck!.items.some((item) => item.key === 'hull_deck.windows_hatches')).toBe(false)
    expect(hullDeck!.items.some((item) => item.key === 'hull_deck.hull_condition')).toBe(true)
  })

  test('an unknown category shows the whole checklist', () => {
    expect(inspectionItemCountForCategory(null)).toBe(ALL_INSPECTION_ITEM_KEYS.size)
  })

  test('every category keeps at least the universal sections', () => {
    for (const category of BOAT_CATEGORIES) {
      const keys = inspectionSectionsForCategory(category).map((section) => section.key)
      expect(keys, category).toContain('hull_deck')
      expect(keys, category).toContain('safety')
      expect(keys, category).toContain('electrical')
    }
  })
})

describe('inspectionCategoryForBoat (legacy fallback)', () => {
  test('prefers the #571 category column', () => {
    expect(
      inspectionCategoryForBoat({ category: 'trawler', type: 'Voilier', propulsionType: null })
    ).toBe('trawler')
  })

  test('falls back on the legacy type then propulsion columns', () => {
    expect(
      inspectionCategoryForBoat({ category: null, type: 'Semi-rigide', propulsionType: null })
    ).toBe('rib')
    expect(
      inspectionCategoryForBoat({ category: null, type: null, propulsionType: 'sailboat' })
    ).toBe('sailboat_monohull')
  })

  test('returns null when nothing allows a guess', () => {
    expect(inspectionCategoryForBoat({ category: null, type: null, propulsionType: null })).toBe(
      null
    )
  })
})

describe('findInspectionChecklistItem', () => {
  test('finds an item by its persisted key', () => {
    expect(findInspectionChecklistItem('safety.lifejackets')?.labelKey).toBe(
      'inspections.checklist.sections.safety.items.lifejackets'
    )
  })

  test('returns null for an unknown key', () => {
    expect(findInspectionChecklistItem('safety.unknown')).toBe(null)
  })
})
