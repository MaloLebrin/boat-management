import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { SAIL_MATERIALS } from '../../shared/types/boat'
import { SAIL_MATERIAL_OPTIONS } from '../../shared/constants/boats/boat_form_options'

/**
 * Les libellés de matériau de voile (#578) sont résolus par des clés
 * construites (`t(\`boats.options.sailMaterial.\${slug}\`)`), que le test
 * statique des namespaces ne peut pas suivre : on vérifie donc ici que chaque
 * slug de la constante a ses clés dans **les deux locales** — même parti pris
 * que les catégories d'équipement (#577).
 */
function loadBoats(locale: 'en' | 'fr'): Record<string, unknown> {
  const path = resolve(__dirname, `../../resources/lang/${locale}/boats.json`)
  return JSON.parse(readFileSync(path, 'utf-8'))
}

test('SAIL_MATERIAL_OPTIONS suit la constante SAIL_MATERIALS (liste et ordre)', () => {
  // Un slug ajouté à la constante sans son option (ou l'inverse) casserait la
  // parité entre le validator et le select du formulaire.
  expect(SAIL_MATERIAL_OPTIONS.map((option) => option.value)).toEqual([...SAIL_MATERIALS])
})

describe.each(['en', 'fr'] as const)('boats.json — %s', (locale) => {
  const boats = loadBoats(locale)

  test('chaque matériau a son libellé de select (options.sailMaterial)', () => {
    const options = (boats.options as Record<string, Record<string, string>>).sailMaterial
    for (const material of SAIL_MATERIALS) {
      expect(options?.[material], `${locale}: options.sailMaterial.${material}`).toBeTypeOf(
        'string'
      )
    }
  })

  test('les labels du formulaire voile existent (sailFields)', () => {
    // Les deux premiers remplacent les labels en dur `Area (m²)` / `Material`
    // de `BoatEquipmentSailFields.vue`, les autres portent la combobox voilerie.
    const fields = boats.sailFields as Record<string, string>
    for (const key of [
      'areaM2',
      'material',
      'sailmaker',
      'sailmakerPlaceholder',
      'sailmakerHint',
      'noSailmakerMatch',
    ]) {
      expect(fields?.[key], `${locale}: sailFields.${key}`).toBeTypeOf('string')
    }
  })

  test('la voilerie a ses libellés d’affichage (fiche voile et PDF)', () => {
    const sailShow = boats.sailShow as { fields: Record<string, string> }
    expect(sailShow.fields.sailmaker, `${locale}: sailShow.fields.sailmaker`).toBeTypeOf('string')

    const maintenanceLog = boats.maintenanceLog as { sailFields: Record<string, string> }
    expect(
      maintenanceLog.sailFields.sailmaker,
      `${locale}: maintenanceLog.sailFields.sailmaker`
    ).toBeTypeOf('string')
  })
})
