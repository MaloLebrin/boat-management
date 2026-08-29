import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import {
  MAINTENANCE_OPERATIONS,
  MAINTENANCE_OPERATIONS_BY_SUBJECT,
  MAINTENANCE_OPERATION_INDEX,
} from '../../shared/constants/maintenance/maintenance_operations'
import {
  MAINTENANCE_SUBJECTS,
  MAINTENANCE_SUBJECT_OPTIONS,
} from '../../shared/constants/maintenance/maintenance_subjects'
import {
  listMaintenanceOperations,
  operationMatchesFamilies,
  resolveEngineFamily,
} from '../../shared/helpers/maintenance_operations'
import { MAINTENANCE_ENGINE_FAMILIES } from '../../shared/types/maintenance'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeKeys(locale: 'en' | 'fr'): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, 'maintenance.json'))
  return new Set(flattenKeys(JSON.parse(raw.toString()), 'maintenance'))
}

describe("Catalogue d'opérations de maintenance (#581)", () => {
  test('le corpus couvre les 10 sujets avec au moins 60 opérations', () => {
    expect(MAINTENANCE_OPERATIONS.length).toBeGreaterThanOrEqual(60)
    for (const subject of MAINTENANCE_SUBJECTS) {
      expect(
        MAINTENANCE_OPERATIONS_BY_SUBJECT[subject].length,
        `aucune opération pour le sujet ${subject}`
      ).toBeGreaterThan(0)
    }
  })

  test('les clés sont uniques, préfixées par leur sujet, et indexées', () => {
    expect(MAINTENANCE_OPERATION_INDEX.size).toBe(MAINTENANCE_OPERATIONS.length)
    for (const operation of MAINTENANCE_OPERATIONS) {
      expect(operation.key.startsWith(`${operation.subject}.`), operation.key).toBe(true)
      expect(operation.labelKey).toBe(`maintenance.operations.${operation.key}.label`)
      if (operation.noteKey) {
        expect(operation.noteKey).toBe(`maintenance.operations.${operation.key}.note`)
      }
    }
  })

  test('toute clé i18n du corpus existe dans les deux locales', () => {
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    for (const operation of MAINTENANCE_OPERATIONS) {
      const keys = [operation.labelKey, operation.noteKey].filter((k): k is string => Boolean(k))
      for (const key of keys) {
        expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
        expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
      }
    }
  })

  test('les intervalles par défaut sont des entiers strictement positifs', () => {
    for (const operation of MAINTENANCE_OPERATIONS) {
      const hasInterval =
        operation.defaultIntervalMonths !== undefined ||
        operation.defaultIntervalEngineHours !== undefined
      expect(hasInterval, `${operation.key} n'a aucun intervalle indicatif`).toBe(true)

      for (const value of [operation.defaultIntervalMonths, operation.defaultIntervalEngineHours]) {
        if (value === undefined) continue
        expect(Number.isInteger(value), `${operation.key}`).toBe(true)
        expect(value).toBeGreaterThan(0)
      }
    }
  })

  test('les heures moteur et les familles ne concernent que le sujet moteur', () => {
    for (const operation of MAINTENANCE_OPERATIONS) {
      if (operation.subject === 'engine') continue
      expect(operation.defaultIntervalEngineHours, operation.key).toBeUndefined()
      expect(operation.families, operation.key).toBeUndefined()
    }
  })

  test('les familles déclarées appartiennent au vocabulaire', () => {
    for (const operation of MAINTENANCE_OPERATIONS) {
      for (const family of operation.families ?? []) {
        expect(MAINTENANCE_ENGINE_FAMILIES).toContain(family)
      }
    }
  })

  test('les sujets et leurs options restent alignés', () => {
    expect(MAINTENANCE_SUBJECT_OPTIONS.map((o) => o.value)).toEqual([...MAINTENANCE_SUBJECTS])
  })
})

describe('Familles moteur (repli kind/fuel en attendant #574)', () => {
  test('dérive la famille du couple kind / fuel', () => {
    expect(resolveEngineFamily('inboard', 'diesel')).toBe('inboard_diesel')
    expect(resolveEngineFamily('inboard', 'essence')).toBe('inboard_petrol')
    expect(resolveEngineFamily('outboard', 'essence')).toBe('outboard_petrol')
    expect(resolveEngineFamily('outboard', 'diesel')).toBe('outboard_diesel')
    expect(resolveEngineFamily('electric', null)).toBe('electric')
    expect(resolveEngineFamily('hybrid', 'diesel')).toBe('hybrid')
  })

  test('ne devine pas quand le couple ne tranche pas', () => {
    expect(resolveEngineFamily('inboard', null)).toBeNull()
    expect(resolveEngineFamily('other', 'diesel')).toBeNull()
    expect(resolveEngineFamily(null, null)).toBeNull()
  })

  test('une opération sans famille concerne tous les moteurs', () => {
    const operation = MAINTENANCE_OPERATION_INDEX.get('engine.winterizing')!
    expect(operation.families).toBeUndefined()
    expect(operationMatchesFamilies(operation, ['inboard_diesel'])).toBe(true)
    expect(operationMatchesFamilies(operation, [])).toBe(true)
  })

  test("aucune bougie n'est proposée sur un diesel", () => {
    const keys = listMaintenanceOperations({
      subject: 'engine',
      engineFamilies: ['inboard_diesel'],
    }).map((operation) => operation.key)

    expect(keys).toContain('engine.oil_change')
    expect(keys).not.toContain('engine.spark_plugs')
    expect(keys).not.toContain('engine.fuel_filter_petrol')
  })

  test('sans famille identifiable, rien n’est masqué', () => {
    const keys = listMaintenanceOperations({ subject: 'engine' }).map((o) => o.key)
    expect(keys).toContain('engine.spark_plugs')
    expect(keys).toContain('engine.injectors')
  })

  test('le sujet priorise sans restreindre', () => {
    const operations = listMaintenanceOperations({ subject: 'safety' })
    expect(operations[0].subject).toBe('safety')
    expect(operations.some((o) => o.subject === 'hull')).toBe(true)
    expect(operations.length).toBe(MAINTENANCE_OPERATIONS.length)
  })
})
