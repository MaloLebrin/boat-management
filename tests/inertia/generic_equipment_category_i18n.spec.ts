import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { GENERIC_EQUIPMENT_CATEGORIES } from '../../shared/types/boat'

/**
 * Les libellés de catégorie d'équipement (#577) sont résolus par des clés
 * construites (`t(\`boats.options.genericEquipmentCategory.\${cat}\`)`), que le
 * test statique des namespaces ne peut pas suivre : on vérifie donc ici que
 * chaque catégorie de la constante a ses clés dans **les deux locales**.
 */
function loadBoats(locale: 'en' | 'fr'): Record<string, unknown> {
  const path = resolve(__dirname, `../../resources/lang/${locale}/boats.json`)
  return JSON.parse(readFileSync(path, 'utf-8'))
}

describe.each(['en', 'fr'] as const)('boats.json — %s', (locale) => {
  const boats = loadBoats(locale)

  test('chaque catégorie a son libellé de select (options.genericEquipmentCategory)', () => {
    const options = (boats.options as Record<string, Record<string, string>>)
      .genericEquipmentCategory
    for (const category of GENERIC_EQUIPMENT_CATEGORIES) {
      expect(
        options?.[category],
        `${locale}: options.genericEquipmentCategory.${category}`
      ).toBeTypeOf('string')
    }
  })

  test('chaque catégorie a sa pastille dans la modale d’ajout (equipmentAddModal.categories)', () => {
    const categories = (boats.equipmentAddModal as Record<string, Record<string, string>>)
      .categories
    for (const category of GENERIC_EQUIPMENT_CATEGORIES) {
      expect(
        categories?.[category],
        `${locale}: equipmentAddModal.categories.${category}`
      ).toBeTypeOf('string')
    }
  })
})
