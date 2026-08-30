import { test } from '@japa/runner'
import {
  engineCatalogFamiliesFromSignals,
  engineFamilyFromCatalogModel,
  engineFamilyFromSignals,
} from '#shared/helpers/engine_family'
import { ENGINE_CATALOG_FAMILIES, ENGINE_FAMILIES } from '#shared/types/engine_catalog'

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

test.group('Familles du catalogue déduites du type de moteur (#597)', () => {
  test('un hors-bord ne remonte que les gammes hors-bord', ({ assert }) => {
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'outboard', fuel: 'essence' }), [
      'outboard_thermal',
    ])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'outboard', fuel: 'electric' }), [
      'outboard_electric',
    ])
  })

  test('sans carburant, retient les deux gammes plausibles plutôt que d’en inventer une', ({
    assert,
  }) => {
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'outboard' }), [
      'outboard_thermal',
      'outboard_electric',
    ])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard' }), [
      'inboard_diesel',
      'inboard_petrol',
    ])
  })

  test('un in-bord suit son carburant', ({ assert }) => {
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard', fuel: 'diesel' }), [
      'inboard_diesel',
    ])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard', fuel: 'essence' }), [
      'inboard_petrol',
    ])
    // Seule gamme électrique du catalogue — son libellé couvre les propulsions
    // électriques, embase comprise.
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard', fuel: 'electric' }), [
      'outboard_electric',
    ])
  })

  test('la famille saisie l’emporte sur `kind` + `fuel`, plus précise', ({ assert }) => {
    // L'utilisateur a explicitement dit « embase Z » : le hors-bord hérité du
    // `kind` ne doit pas primer.
    assert.deepEqual(
      engineCatalogFamiliesFromSignals({ kind: 'outboard', fuel: 'essence', family: 'sterndrive' }),
      ['inboard_petrol']
    )
    assert.deepEqual(
      engineCatalogFamiliesFromSignals({ kind: 'inboard', family: 'inboard_diesel_saildrive' }),
      ['inboard_diesel']
    )
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard', family: 'jet' }), ['jet'])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'inboard', family: 'generator' }), [
      'generator',
    ])
  })

  test('ne privilégie rien quand le type ne désigne aucune gamme', ({ assert }) => {
    // Un tableau vide veut dire « rien à privilégier », jamais « aucune
    // marque » : le sélecteur garde alors son ordre alphabétique complet.
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'hybrid' }), [])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: 'other' }), [])
    assert.deepEqual(engineCatalogFamiliesFromSignals({}), [])
    assert.deepEqual(engineCatalogFamiliesFromSignals({ kind: '', fuel: '', family: '' }), [])
  })

  test('ne renvoie que des familles du catalogue', ({ assert }) => {
    const cases = [
      { kind: 'outboard' },
      { kind: 'inboard' },
      { kind: 'electric' },
      { kind: 'inboard', family: 'pod_drive' },
      { kind: 'outboard', family: 'electric_inboard' },
      { kind: 'outboard', family: 'outboard_2t' },
    ]
    for (const signals of cases) {
      for (const family of engineCatalogFamiliesFromSignals(signals)) {
        assert.include(ENGINE_CATALOG_FAMILIES, family)
      }
    }
  })
})
