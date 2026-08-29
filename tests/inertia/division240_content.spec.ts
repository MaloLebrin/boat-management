import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { SAFETY_EQUIPMENT_TYPE_OPTIONS } from '../../shared/constants/boats/boat_form_options'
import {
  ARMAMENT_ZONE_OPTIONS,
  DIVISION_240_LIFETIMES,
  DIVISION_240_REQUIREMENTS,
  DIVISION_240_REQUIREMENT_INDEX,
  DIVISION_240_TEXT_VERSION,
  DIVISION_240_UNTRACKED_ITEMS,
  lifetimeFor,
  requirementsForZone,
} from '../../shared/constants/safety/division240_content'
import { ARMAMENT_ZONES, ARMAMENT_ZONE_RANK } from '../../shared/types/safety'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeKeys(locale: 'en' | 'fr'): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, 'boats.json'))
  return new Set(flattenKeys(JSON.parse(raw.toString()), 'boats'))
}

describe('Corpus Division 240 (#582)', () => {
  test('couvre les quatre zones et ne cite que des types de l’inventaire', () => {
    const vocabulary = new Set(SAFETY_EQUIPMENT_TYPE_OPTIONS.map((option) => option.value))

    for (const zone of ARMAMENT_ZONES) {
      expect(
        requirementsForZone(zone).length,
        `aucune exigence pour la zone ${zone}`
      ).toBeGreaterThan(0)
    }
    for (const requirement of DIVISION_240_REQUIREMENTS) {
      expect(vocabulary.has(requirement.equipmentType), requirement.equipmentType).toBe(true)
    }
  })

  test('les clés sont uniques, préfixées par leur zone, et portent une référence', () => {
    expect(DIVISION_240_REQUIREMENT_INDEX.size).toBe(DIVISION_240_REQUIREMENTS.length)
    for (const requirement of DIVISION_240_REQUIREMENTS) {
      expect(requirement.key).toBe(`${requirement.minZone}.${requirement.equipmentType}`)
      expect(requirement.labelKey).toBe(`boats.safetyCompliance.requirements.${requirement.key}`)
      expect(requirement.articleRef).not.toBe('')
    }
  })

  test('les exigences sont cumulatives d’une zone à la suivante', () => {
    for (const zone of ARMAMENT_ZONES) {
      const keys = new Set(requirementsForZone(zone).map((requirement) => requirement.key))
      const further = ARMAMENT_ZONES.filter(
        (candidate) => ARMAMENT_ZONE_RANK[candidate] > ARMAMENT_ZONE_RANK[zone]
      )
      for (const wider of further) {
        for (const key of keys) {
          expect(
            requirementsForZone(wider).some((requirement) => requirement.key === key),
            `${key} disparaît en zone ${wider}`
          ).toBe(true)
        }
      }
    }
  })

  test('les durées de vie sont positives et indexées par type', () => {
    for (const lifetime of DIVISION_240_LIFETIMES) {
      expect(lifetime.months).toBeGreaterThan(0)
      expect(lifetimeFor(lifetime.equipmentType)).toEqual(lifetime)
    }
    expect(lifetimeFor('radar')).toBeNull()
  })

  test('la version du texte de référence est datée', () => {
    expect(DIVISION_240_TEXT_VERSION).toMatch(/^\d{4}-\d{2}$/)
  })

  test('toute clé i18n du corpus existe dans les deux locales', () => {
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    const keys = [
      ...DIVISION_240_REQUIREMENTS.map((requirement) => requirement.labelKey),
      ...DIVISION_240_LIFETIMES.map((lifetime) => lifetime.labelKey),
      ...DIVISION_240_UNTRACKED_ITEMS.map((item) => `boats.safetyCompliance.untracked.${item}`),
      ...ARMAMENT_ZONE_OPTIONS.map((option) => `boats.options.armamentZone.${option.value}`),
    ]

    for (const key of keys) {
      expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
      expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
    }
  })

  test('les options de zone couvrent exactement le vocabulaire', () => {
    expect(ARMAMENT_ZONE_OPTIONS.map((option) => option.value)).toEqual([...ARMAMENT_ZONES])
  })
})
