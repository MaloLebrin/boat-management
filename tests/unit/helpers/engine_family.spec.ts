import { test } from '@japa/runner'
import {
  engineFamilyFromCatalogModel,
  engineFamilyFromSignals,
} from '#shared/helpers/engine_family'
import { ENGINE_FAMILIES } from '#shared/types/engine_catalog'

test.group('Dérivation de la famille de motorisation (#574)', () => {
  test('déduit la famille hors-bord du cycle moteur', ({ assert }) => {
    assert.equal(
      engineFamilyFromSignals({ kind: 'outboard', strokeType: '2_stroke' }),
      'outboard_2t'
    )
    assert.equal(
      engineFamilyFromSignals({ kind: 'outboard', strokeType: '4_stroke' }),
      'outboard_4t'
    )
  })

  test('classe un hors-bord sans cycle en 4 temps plutôt que sans famille', ({ assert }) => {
    // Sans ce défaut, tous les hors-bord enregistrés avant #574 perdraient
    // l'écran pièces qu'ils ont depuis #517.
    assert.equal(engineFamilyFromSignals({ kind: 'outboard' }), 'outboard_4t')
  })

  test('classe un in-bord diesel en ligne d’arbre, la variante saildrive n’étant pas devinable', ({
    assert,
  }) => {
    assert.equal(
      engineFamilyFromSignals({ kind: 'inboard', fuel: 'diesel' }),
      'inboard_diesel_shaft'
    )
    assert.equal(engineFamilyFromSignals({ kind: 'inboard', fuel: 'essence' }), 'inboard_petrol')
  })

  test('suit le `kind` pour une motorisation électrique', ({ assert }) => {
    assert.equal(
      engineFamilyFromSignals({ kind: 'outboard', fuel: 'electric' }),
      'electric_outboard'
    )
    assert.equal(engineFamilyFromSignals({ kind: 'inboard', fuel: 'electric' }), 'electric_inboard')
    assert.equal(engineFamilyFromSignals({ kind: 'hybrid', fuel: 'diesel' }), 'hybrid')
  })

  test('ne devine rien quand la réponse serait une invention', ({ assert }) => {
    // `kind: 'electric'` ne dit pas si le moteur est in-bord ou hors-bord, et
    // un in-bord sans carburant n'a ni injection ni allumage assurés.
    assert.isNull(engineFamilyFromSignals({ kind: 'electric' }))
    assert.isNull(engineFamilyFromSignals({ kind: 'inboard' }))
    assert.isNull(engineFamilyFromSignals({ kind: 'other', fuel: 'diesel' }))
    assert.isNull(engineFamilyFromSignals({}))
  })

  test('ne renvoie que des familles du vocabulaire', ({ assert }) => {
    const cases = [
      { kind: 'outboard', strokeType: '2_stroke' },
      { kind: 'outboard', fuel: 'electric' },
      { kind: 'inboard', fuel: 'diesel' },
      { kind: 'inboard', fuel: 'essence' },
      { kind: 'inboard', fuel: 'electric' },
      { kind: 'hybrid' },
    ]
    for (const signals of cases) {
      const family = engineFamilyFromSignals(signals)
      assert.isNotNull(family)
      assert.include(ENGINE_FAMILIES, family!)
    }
  })

  test('traduit une famille du catalogue en famille de motorisation', ({ assert }) => {
    assert.equal(
      engineFamilyFromCatalogModel({ family: 'outboard_thermal', strokeType: '2_stroke' }),
      'outboard_2t'
    )
    assert.equal(engineFamilyFromCatalogModel({ family: 'outboard_thermal' }), 'outboard_4t')
    assert.equal(engineFamilyFromCatalogModel({ family: 'outboard_electric' }), 'electric_outboard')
    // Le catalogue classe des gammes : il ne sait pas sous quelle transmission
    // un D2-40 est installé, la variante la plus courante est retenue.
    assert.equal(engineFamilyFromCatalogModel({ family: 'inboard_diesel' }), 'inboard_diesel_shaft')
    assert.equal(engineFamilyFromCatalogModel({ family: 'inboard_petrol' }), 'inboard_petrol')
    assert.equal(engineFamilyFromCatalogModel({ family: 'jet' }), 'jet')
    assert.equal(engineFamilyFromCatalogModel({ family: 'generator' }), 'generator')
  })
})
