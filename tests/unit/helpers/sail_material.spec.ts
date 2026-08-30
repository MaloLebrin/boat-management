import { test } from '@japa/runner'
import { legacyMaterialNote, normalizeSailMaterial } from '#shared/helpers/sail_material'
import { SAIL_MATERIALS } from '#shared/types/boat'

/**
 * Normalisation best-effort du matériau de voile (#578). Comme pour les pays
 * (#580), c'est le helper qui porte la logique métier de la migration
 * `1843000002000_normalize_boat_sails_material` — la tester ici verrouille le
 * comportement du backfill.
 */
test.group('shared/helpers/sail_material — normalizeSailMaterial', () => {
  test('laisse passer les slugs du vocabulaire tels quels', ({ assert }) => {
    for (const material of SAIL_MATERIALS) {
      assert.equal(normalizeSailMaterial(material), material, `échec sur « ${material} »`)
    }
  })

  test('est insensible à la casse, aux accents et à la ponctuation', ({ assert }) => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['Dacron', 'dacron'],
      ['DACRON®', 'dacron'],
      ['Laminé', 'laminate'],
      ['laminé mylar', 'laminate'],
      ['HYDRA NET', 'hydranet'],
      ['Hydranet', 'hydranet'],
      ['Nylon_Spi', 'nylon_spi'],
    ]
    for (const [input, expected] of cases) {
      assert.equal(normalizeSailMaterial(input), expected, `échec sur « ${input} »`)
    }
  })

  test('rapproche les appellations réellement rencontrées', ({ assert }) => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['polyester', 'dacron'],
      ['Polyester tissé', 'dacron'],
      ['tergal', 'dacron'],
      ['Mylar', 'laminate'],
      ['Pentex', 'laminate'],
      ['stratifié', 'laminate'],
      ['3Di', 'membrane'],
      ['membrane carbone', 'membrane'],
      ['kevlar', 'membrane'],
      ['aramide', 'membrane'],
      ['Vectran', 'membrane'],
      ['nylon', 'nylon_spi'],
      ['Spinnaker nylon', 'nylon_spi'],
      ['spi', 'nylon_spi'],
      ['Cuben fiber', 'cuben'],
      ['Ultra PE', 'cuben'],
      ['Dyneema', 'cuben'],
      ['Autre', 'other'],
      ['other', 'other'],
    ]
    for (const [input, expected] of cases) {
      assert.equal(normalizeSailMaterial(input), expected, `échec sur « ${input} »`)
    }
  })

  test('retient le motif le plus spécifique quand plusieurs matchent', ({ assert }) => {
    // Une membrane chargée en polyester reste une membrane, pas du Dacron ; le
    // Hydra Net est un tissage polyester/Dyneema mais garde son slug propre.
    assert.equal(normalizeSailMaterial('membrane polyester'), 'membrane')
    assert.equal(normalizeSailMaterial('Hydra Net polyester'), 'hydranet')
    assert.equal(normalizeSailMaterial('laminé nylon'), 'laminate')
  })

  test('renvoie null pour une valeur non mappable — la migration bascule sur other', ({
    assert,
  }) => {
    for (const input of ['toile', 'coton', 'inconnu', '', '   ', '—']) {
      assert.isNull(normalizeSailMaterial(input), `échec sur « ${input} »`)
    }
    assert.isNull(normalizeSailMaterial(null))
    assert.isNull(normalizeSailMaterial(undefined))
  })
})

test.group('shared/helpers/sail_material — legacyMaterialNote', () => {
  test('verrouille le format de la note recopiée par la migration', ({ assert }) => {
    assert.equal(legacyMaterialNote('Toile épaisse'), 'Matériau saisi : Toile épaisse')
  })
})
