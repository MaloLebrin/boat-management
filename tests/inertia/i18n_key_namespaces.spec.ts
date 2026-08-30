import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * Issue #459 — « pwa.install » et « offline.banner » s'affichaient en clair dans
 * l'UI : les clés vivent dans `common.json`, `appT` les expose donc préfixées
 * (`common.pwa.install`), mais les composants appelaient `t('pwa.install')`.
 * `useT` renvoie la clé brute quand elle n'existe pas — aucun test ne le voyait
 * parce que chaque spec mockait `appT` avec la clé telle qu'appelée.
 *
 * Ce garde-fou lit les vraies traductions et vérifie que chaque clé littérale
 * passée à `t()` dans `inertia/` résout dans les deux locales.
 */

// Vitest est lancé depuis la racine du projet (cf. `vitest.config.ts`).
const ROOT = process.cwd()

// Namespaces backend-only, exclus de `appT` par InertiaMiddleware.
const BACKEND_NAMESPACES = new Set(['flash', 'marketing', 'validator'])

const LOCALES = ['en', 'fr'] as const

/**
 * Clés déjà cassées avant #459 et hors de son périmètre : elles pointent sur un
 * objet du namespace `equipment` / `boats` (ex. `equipment.notes` → `{ label,
 * placeholder }`) et affichent donc la clé brute comme libellé de champ.
 * À vider au fur et à mesure — le test échoue aussi si une entrée devient
 * obsolète, pour éviter que cette liste ne pourrisse.
 */
const KNOWN_UNRESOLVED = ['boats.equipment.notes.label', 'boats.equipment.notes.placeholder']

function flatten(value: unknown, prefix: string, out: Set<string>) {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
    return
  }
  out.add(prefix)
}

function loadLocaleKeys(locale: string): Set<string> {
  const dir = join(ROOT, 'resources/lang', locale)
  const keys = new Set<string>()
  for (const file of readdirSync(dir)) {
    if (extname(file) !== '.json') continue
    const namespace = file.slice(0, -'.json'.length)
    if (BACKEND_NAMESPACES.has(namespace)) continue
    flatten(JSON.parse(readFileSync(join(dir, file), 'utf8')), namespace, keys)
  }
  return keys
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
 * Clés littérales `t('…')` — la clé doit être suivie de `,` ou `)` pour écarter
 * les clés dynamiques (`t('planning.taskKind.' + kind)`, template literals).
 */
function collectUsedKeys(): Map<string, string[]> {
  const used = new Map<string, string[]>()
  for (const file of listSourceFiles(join(ROOT, 'inertia'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\bt\(\s*'([^'\n]+)'\s*[,)]/g)) {
      const key = match[1]
      // Une clé sans point est forcément un faux positif (`t()` d'une autre lib).
      if (!key.includes('.')) continue
      const path = relative(ROOT, file)
      const files = used.get(key) ?? []
      if (!files.includes(path)) files.push(path)
      used.set(key, files)
    }
  }
  return used
}

describe('i18n — clés t() préfixées par leur namespace', () => {
  const usedKeys = collectUsedKeys()

  test('des clés sont bien collectées dans inertia/', () => {
    expect(usedKeys.size).toBeGreaterThan(100)
  })

  for (const locale of LOCALES) {
    test(`toute clé t() littérale résout en ${locale}`, () => {
      const available = loadLocaleKeys(locale)
      const unresolved = [...usedKeys.entries()]
        .filter(([key]) => !available.has(key) && !KNOWN_UNRESOLVED.includes(key))
        .map(([key, files]) => `${key} (${files.join(', ')})`)

      expect(unresolved).toEqual([])
    })
  }

  test('les clés de #459 résolvent dans les deux locales', () => {
    for (const locale of LOCALES) {
      const available = loadLocaleKeys(locale)
      expect(available.has('common.pwa.install')).toBe(true)
      expect(available.has('common.offline.banner')).toBe(true)
    }
    expect(usedKeys.has('pwa.install')).toBe(false)
    expect(usedKeys.has('offline.banner')).toBe(false)
  })

  test('KNOWN_UNRESOLVED ne contient pas d’entrée obsolète', () => {
    const available = loadLocaleKeys('fr')
    const stale = KNOWN_UNRESOLVED.filter((key) => !usedKeys.has(key) || available.has(key))
    expect(stale).toEqual([])
  })
})
