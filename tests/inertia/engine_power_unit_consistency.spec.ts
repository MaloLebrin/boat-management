import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * Issue #469 — le formulaire moteur demandait une « Puissance (ch) » et la
 * fiche bateau réaffichait la même valeur en « 40 cv », pendant que deux écrans
 * la rendaient avec un « HP » écrit en dur (donc identique en français et en
 * anglais). Ce garde-fou lit les vraies traductions et les vraies sources : une
 * seule unité par locale, et aucun écran ne la réécrit à la main.
 */

const ROOT = process.cwd()
const LOCALES = ['en', 'fr'] as const

/** Unités déjà croisées dans le produit, quelle que soit la casse. */
const UNIT_LITERALS = ['hp', 'cv', 'ch']

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
 * Sites d'affichage : `powerHp` rendu dans une interpolation `{{ … }}` ou dans
 * un littéral de gabarit `${ … }`. Écarte le formulaire de saisie, où `powerHp`
 * n'apparaît qu'en `id`/`name`/`v-model` — il porte le libellé, pas l'unité.
 */
function collectPowerDisplayFiles(): string[] {
  const files: string[] = []
  for (const file of listSourceFiles(join(ROOT, 'inertia'))) {
    const source = readFileSync(file, 'utf8')
    if (/\{\{[^{}]*powerHp[^{}]*\}\}|\$\{[^{}]*powerHp[^{}]*\}/.test(source)) {
      files.push(relative(ROOT, file))
    }
  }
  return files
}

describe('#469 — une seule unité de puissance moteur', () => {
  const displayFiles = collectPowerDisplayFiles()

  test('des écrans affichant la puissance sont bien collectés', () => {
    expect(displayFiles.length).toBeGreaterThan(0)
  })

  test('aucun écran ne réécrit l’unité à la main', () => {
    const unit = UNIT_LITERALS.join('|')
    const offenders = displayFiles.filter((file) =>
      // `powerHp` suivi, dans la même expression, d'une unité littérale :
      // `{{ engine.powerHp }} HP`, `${engine.powerHp} cv`…
      new RegExp(`powerHp[^\\n]{0,12}?[}\`'"]\\s*(${unit})\\b`, 'i').test(
        readFileSync(join(ROOT, file), 'utf8')
      )
    )

    expect(offenders).toEqual([])
  })

  test('tout écran affichant la puissance passe par la clé d’unité', () => {
    const divergent = displayFiles.filter(
      (file) => !readFileSync(join(ROOT, file), 'utf8').includes('boats.engines.powerUnit')
    )

    expect(divergent).toEqual([])
  })

  for (const locale of LOCALES) {
    test(`le libellé du formulaire annonce l’unité affichée en ${locale}`, () => {
      const unit = resolveKey(locale, 'boats.engines.powerUnit')
      const label = resolveKey(locale, 'boats.engines.fields.powerHp')
      const announced = label.match(/\(([^)]+)\)\s*$/)?.[1]

      expect(announced, `${label} doit annoncer son unité entre parenthèses`).toBe(unit)
    })

    test(`le PDF de carnet d’entretien reprend la même unité en ${locale}`, () => {
      const unit = resolveKey(locale, 'boats.engines.powerUnit')
      const pdf = resolveKey(locale, 'boats.maintenanceLog.engineFields.hp')

      expect(pdf).toBe(`{value} ${unit}`)
    })
  }

  test('le français note la puissance en « ch », pas en « cv »', () => {
    // « CV » désigne les chevaux fiscaux ; la puissance d'un moteur s'exprime
    // en chevaux-vapeur, notés « ch ».
    expect(resolveKey('fr', 'boats.engines.powerUnit')).toBe('ch')
  })
})
