import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * Issue #468 — un même écran portait trois noms : « Mes bateaux » (sidebar),
 * « Bateaux » (titre de page) et « Flotte » (fil d'Ariane), tous pointant sur
 * `/boats`. Ce garde-fou lit les vraies traductions et vérifie qu'une entrée de
 * navigation ou de fil d'Ariane visant `/boats` affiche exactement le titre de
 * la page de destination, dans les deux locales.
 */

const ROOT = process.cwd()
const LOCALES = ['en', 'fr'] as const

function resolveKey(locale: string, key: string): string {
  const [namespace, ...path] = key.split('.')
  const file = join(ROOT, 'resources/lang', locale, `${namespace}.json`)
  let value: unknown = JSON.parse(readFileSync(file, 'utf8'))
  for (const segment of path) {
    value = (value as Record<string, unknown>)[segment]
  }
  expect(typeof value, `${key} doit être une chaîne en ${locale}`).toBe('string')
  return value as string
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path))
    } else if (['.ts', '.vue'].includes(extname(path))) {
      files.push(path)
    }
  }
  return files
}

/**
 * Entrées `{ label: t('…'), href: '/boats' }` (fils d'Ariane) et
 * `{ name: t('…'), path: '/boats' }` (sidebar). Le guillemet fermant écarte
 * `/boats/${id}` et `/owner/boats`, qui désignent d'autres écrans.
 */
function collectBoatsIndexLabelKeys(): Map<string, string[]> {
  const keys = new Map<string, string[]>()
  for (const file of listSourceFiles(join(ROOT, 'inertia'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(
      /t\(\s*'([^'\n]+)'\s*\)\s*,\s*(?:href|path):\s*'\/boats'/g
    )) {
      const key = match[1]
      const path = relative(ROOT, file)
      const files = keys.get(key) ?? []
      if (!files.includes(path)) files.push(path)
      keys.set(key, files)
    }
  }
  return keys
}

describe('#468 — un seul nom pour l’écran /boats', () => {
  const labelKeys = collectBoatsIndexLabelKeys()

  test('des libellés pointant sur /boats sont bien collectés', () => {
    expect(labelKeys.size).toBeGreaterThan(0)
  })

  for (const locale of LOCALES) {
    test(`tout libellé visant /boats affiche le titre de la page en ${locale}`, () => {
      const expected = resolveKey(locale, 'boats.index.title')
      const divergent = [...labelKeys.entries()]
        .filter(([key]) => resolveKey(locale, key) !== expected)
        .map(([key, files]) => `${key} = "${resolveKey(locale, key)}" (${files.join(', ')})`)

      expect(divergent).toEqual([])
    })
  }

  for (const locale of LOCALES) {
    test(`le portail propriétaire garde son propre nom en ${locale}`, () => {
      // `/owner/boats` liste les bateaux du propriétaire connecté : « Mes
      // bateaux » y est juste, et sidebar et titre de page s'accordent déjà.
      expect(resolveKey(locale, 'nav.myBoats')).toBe(resolveKey(locale, 'owner.boats.index.title'))
    })
  }
})
