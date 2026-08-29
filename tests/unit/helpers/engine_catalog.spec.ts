import {
  ENGINE_CATALOG_BRANDS,
  normalizeEngineBrandModels,
} from '#database/data/engine_catalog/index'
import { ENGINE_FUELS } from '#shared/constants/boats/boat_form_options'
import { normalizeCatalogText, slugifyCatalogName } from '#shared/helpers/boat_catalog'
import { catalogTokenNgrams, catalogTokens } from '#shared/helpers/engine_catalog'
import { ENGINE_FAMILIES } from '#shared/types/engine_catalog'
import { test } from '@japa/runner'

test.group('catalogTokens', () => {
  test('découpe une saisie libre en mots normalisés', ({ assert }) => {
    assert.deepEqual(catalogTokens('Volvo Penta D2-40'), ['volvo', 'penta', 'd2', '40'])
    assert.deepEqual(catalogTokens('EVINRUDE 6cv'), ['evinrude', '6cv'])
    assert.deepEqual(catalogTokens('Solé Diesel'), ['sole', 'diesel'])
  })

  test('ignore la ponctuation seule', ({ assert }) => {
    assert.deepEqual(catalogTokens('   '), [])
    assert.deepEqual(catalogTokens('— / —'), [])
  })
})

test.group('catalogTokenNgrams', () => {
  test('produit les groupes de mots consécutifs, du plus long au plus court', ({ assert }) => {
    const ngrams = catalogTokenNgrams('Volvo Penta D2')

    assert.equal(ngrams[0], 'volvopentad2')
    assert.include(ngrams, 'volvopenta')
    assert.include(ngrams, 'volvo')
    assert.include(ngrams, 'd2')
    // L'ordre décroissant fait gagner la correspondance la plus spécifique.
    assert.isBelow(ngrams.indexOf('volvopenta'), ngrams.indexOf('volvo'))
  })

  test('ne produit que des groupes contigus — pas de faux positif par recollement', ({
    assert,
  }) => {
    // `mercury ... mariner` non contigus ne doivent pas former `mercurymariner`.
    assert.notInclude(catalogTokenNgrams('Mercury 40 Mariner'), 'mercurymariner')
  })
})

test.group('corpus du catalogue moteur', () => {
  test('atteint les volumes visés par la v1 (#573)', ({ assert }) => {
    const modelCount = ENGINE_CATALOG_BRANDS.reduce(
      (total, brand) => total + normalizeEngineBrandModels(brand).length,
      0
    )

    assert.isAtLeast(ENGINE_CATALOG_BRANDS.length, 70)
    assert.isAtLeast(modelCount, 900)
  })

  test('couvre toutes les familles de l’épic', ({ assert }) => {
    const covered = new Set<string>()
    for (const brand of ENGINE_CATALOG_BRANDS) {
      for (const model of normalizeEngineBrandModels(brand)) covered.add(model.family)
    }

    for (const family of ENGINE_FAMILIES) {
      assert.isTrue(covered.has(family), `aucun modèle pour la famille ${family}`)
    }
  })

  test('ne déclare que des slugs stables et des vocabulaires connus', ({ assert }) => {
    for (const brand of ENGINE_CATALOG_BRANDS) {
      assert.equal(
        brand.slug,
        slugifyCatalogName(brand.slug),
        `slug de marque instable: ${brand.slug}`
      )
      assert.isNotEmpty(brand.families, `marque sans famille: ${brand.slug}`)
      for (const family of brand.families) {
        assert.include(ENGINE_FAMILIES, family, `famille inconnue sur ${brand.slug}`)
      }

      const slugs = new Set<string>()
      for (const model of normalizeEngineBrandModels(brand)) {
        assert.equal(
          model.slug,
          slugifyCatalogName(model.slug),
          `slug de modèle instable: ${brand.slug}/${model.slug}`
        )
        assert.isFalse(
          slugs.has(model.slug),
          `slug de modèle en double: ${brand.slug}/${model.slug}`
        )
        slugs.add(model.slug)

        assert.include(ENGINE_FAMILIES, model.family, `famille inconnue sur ${model.slug}`)
        if (model.fuel) assert.include(ENGINE_FUELS, model.fuel, `carburant inconnu: ${model.slug}`)
        if (model.strokeType) {
          assert.include(['2_stroke', '4_stroke'], model.strokeType, `cycle inconnu: ${model.slug}`)
        }
      }
    }
  })

  test('déclare chaque marque une seule fois, sans clé de rapprochement ambiguë', ({ assert }) => {
    const slugs = ENGINE_CATALOG_BRANDS.map((brand) => brand.slug)
    assert.equal(new Set(slugs).size, slugs.length)

    // Une même clé partagée par deux marques rendrait `resolveBrand()` dépendant
    // de l'ordre d'insertion en base : `mercury` doit désigner Mercury et rien
    // d'autre.
    const owner = new Map<string, string>()
    for (const brand of ENGINE_CATALOG_BRANDS) {
      for (const candidate of [brand.slug, brand.name, ...(brand.aliases ?? [])]) {
        const key = normalizeCatalogText(candidate)
        if (!key) continue
        assert.isTrue(
          !owner.has(key) || owner.get(key) === brand.slug,
          `clé de rapprochement ambiguë « ${key} » : ${owner.get(key)} et ${brand.slug}`
        )
        owner.set(key, brand.slug)
      }
    }
  })

  test('recopie le code plaque sur les marques dont le nom en tient lieu', ({ assert }) => {
    const volvo = ENGINE_CATALOG_BRANDS.find((brand) => brand.slug === 'volvo-penta')
    const d240 = normalizeEngineBrandModels(volvo!).find((model) => model.slug === 'd2-40')
    assert.equal(d240?.modelCode, 'D2-40')

    // À l'inverse, le préfixe de plaque d'un hors-bord japonais ne se déduit pas
    // du nom commercial : on ne le reconstitue pas.
    const yamaha = ENGINE_CATALOG_BRANDS.find((brand) => brand.slug === 'yamaha')
    const f150 = normalizeEngineBrandModels(yamaha!).find((model) => model.slug === 'f150')
    assert.isUndefined(f150?.modelCode)
  })

  test('conserve le Yamaha 4AS déjà seedé — un moteur de 1998 trouve son modèle', ({ assert }) => {
    const yamaha = ENGINE_CATALOG_BRANDS.find((brand) => brand.slug === 'yamaha')
    const models = normalizeEngineBrandModels(yamaha!)

    const legacy = models.find((model) => model.name === '4AS')
    assert.isDefined(legacy)
    assert.equal(legacy?.strokeType, '2_stroke')
  })

  test('applique les défauts de marque sans écraser un modèle qui les précise', ({ assert }) => {
    const oxe = ENGINE_CATALOG_BRANDS.find((brand) => brand.slug === 'oxe-marine')
    // Seul hors-bord diesel du corpus : le défaut de marque porte le carburant.
    assert.isTrue(normalizeEngineBrandModels(oxe!).every((model) => model.fuel === 'diesel'))

    const mercruiser = ENGINE_CATALOG_BRANDS.find((brand) => brand.slug === 'mercruiser')
    const diesel = normalizeEngineBrandModels(mercruiser!).find(
      (model) => model.name === '2.8L Diesel'
    )
    // Le défaut de marque est `essence` : le modèle l'emporte.
    assert.equal(diesel?.fuel, 'diesel')
  })
})
