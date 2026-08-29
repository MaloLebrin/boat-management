import {
  deriveCategoryFromLegacy,
  normalizeCatalogText,
  slugifyCatalogName,
} from '#shared/helpers/boat_catalog'
import { BOAT_CATALOG_BRANDS, normalizeBrandModels } from '#database/data/boat_catalog/index'
import { BOAT_CATEGORIES } from '#shared/types/boat_catalog'
import { test } from '@japa/runner'

test.group('slugifyCatalogName', () => {
  test('produit un slug kebab-case sans accent', ({ assert }) => {
    assert.equal(slugifyCatalogName('Bénéteau'), 'beneteau')
    assert.equal(slugifyCatalogName('Fountaine Pajot'), 'fountaine-pajot')
    assert.equal(slugifyCatalogName('Sea-Doo'), 'sea-doo')
    assert.equal(slugifyCatalogName('X-Yachts'), 'x-yachts')
    assert.equal(slugifyCatalogName("Gib'Sea 302"), 'gibsea-302')
    assert.equal(slugifyCatalogName('Malö 44'), 'malo-44')
  })
})

test.group('normalizeCatalogText', () => {
  test('rapproche les orthographes réellement rencontrées', ({ assert }) => {
    const expected = 'beneteau'
    assert.equal(normalizeCatalogText('Bénéteau'), expected)
    assert.equal(normalizeCatalogText('BENETEAU'), expected)
    assert.equal(normalizeCatalogText('beneteau'), expected)
    assert.equal(normalizeCatalogText(' Béné-teau '), expected)
  })

  test('renvoie une chaîne vide pour une saisie sans caractère utile', ({ assert }) => {
    assert.equal(normalizeCatalogText('   '), '')
    assert.equal(normalizeCatalogText('—'), '')
  })
})

test.group('deriveCategoryFromLegacy', () => {
  test('normalise les valeurs texte libre les plus courantes', ({ assert }) => {
    assert.equal(deriveCategoryFromLegacy('Voilier', null), 'sailboat_monohull')
    assert.equal(deriveCategoryFromLegacy('voilier monocoque', null), 'sailboat_monohull')
    assert.equal(deriveCategoryFromLegacy('Sailboat', null), 'sailboat_monohull')
    assert.equal(deriveCategoryFromLegacy('Semi-rigide', null), 'rib')
    assert.equal(deriveCategoryFromLegacy('RIB', null), 'rib')
    assert.equal(deriveCategoryFromLegacy('Zodiac', null), 'rib')
    assert.equal(deriveCategoryFromLegacy('Trimaran', null), 'sailboat_multihull')
    assert.equal(deriveCategoryFromLegacy('Vedette', null), 'motor_yacht')
    assert.equal(deriveCategoryFromLegacy('Jet-ski', null), 'jetski')
    assert.equal(deriveCategoryFromLegacy('Péniche', null), 'houseboat')
    assert.equal(deriveCategoryFromLegacy('Trawler', null), 'trawler')
    assert.equal(deriveCategoryFromLegacy('Annexe', null), 'tender')
  })

  test('fait gagner le motif le plus spécifique', ({ assert }) => {
    assert.equal(deriveCategoryFromLegacy('Catamaran à moteur', null), 'power_catamaran')
    assert.equal(deriveCategoryFromLegacy('Catamaran', null), 'sailboat_multihull')
  })

  test('accepte une valeur déjà écrite avec le slug du vocabulaire', ({ assert }) => {
    for (const category of BOAT_CATEGORIES) {
      assert.equal(deriveCategoryFromLegacy(category, null), category)
    }
  })

  test('retombe sur la propulsion quand le type ne dit rien', ({ assert }) => {
    assert.equal(deriveCategoryFromLegacy(null, 'sailboat'), 'sailboat_monohull')
    assert.equal(deriveCategoryFromLegacy('', 'motorboat'), 'motor_yacht')
    assert.equal(deriveCategoryFromLegacy('Bateau de Jean', 'catamaran'), 'sailboat_multihull')
    assert.equal(deriveCategoryFromLegacy(null, 'rib'), 'rib')
  })

  test('renvoie null plutôt que de deviner', ({ assert }) => {
    assert.isNull(deriveCategoryFromLegacy(null, null))
    assert.isNull(deriveCategoryFromLegacy('Bateau de Jean', null))
    assert.isNull(deriveCategoryFromLegacy('???', 'inconnu'))
  })
})

test.group('corpus du catalogue', () => {
  test('atteint les volumes visés par la v1 (#571)', ({ assert }) => {
    const modelCount = BOAT_CATALOG_BRANDS.reduce(
      (total, brand) => total + normalizeBrandModels(brand).length,
      0
    )
    assert.isAtLeast(BOAT_CATALOG_BRANDS.length, 250)
    assert.isAtLeast(modelCount, 2000)
  })

  test('couvre toutes les catégories du vocabulaire sauf « other »', ({ assert }) => {
    const covered = new Set<string>()
    for (const brand of BOAT_CATALOG_BRANDS) {
      for (const model of normalizeBrandModels(brand)) covered.add(model.category)
    }
    // `other` est le repli de saisie, aucune marque ne s'y range.
    for (const category of BOAT_CATEGORIES.filter((c) => c !== 'other')) {
      assert.isTrue(covered.has(category), `aucun modèle pour la catégorie ${category}`)
    }
  })

  test('ne déclare que des slugs stables et des catégories du vocabulaire', ({ assert }) => {
    for (const brand of BOAT_CATALOG_BRANDS) {
      assert.equal(
        brand.slug,
        slugifyCatalogName(brand.slug),
        `slug de marque instable: ${brand.slug}`
      )
      assert.isNotEmpty(brand.categories, `marque sans catégorie: ${brand.slug}`)
      for (const category of brand.categories) {
        assert.include(BOAT_CATEGORIES, category, `catégorie inconnue sur ${brand.slug}`)
      }

      const slugs = new Set<string>()
      for (const model of normalizeBrandModels(brand)) {
        assert.isFalse(
          slugs.has(model.slug),
          `slug de modèle en double: ${brand.slug}/${model.slug}`
        )
        slugs.add(model.slug)
        assert.include(BOAT_CATEGORIES, model.category, `catégorie inconnue sur ${model.slug}`)
      }
    }
  })

  test('déclare chaque marque dans une seule catégorie principale', ({ assert }) => {
    const slugs = BOAT_CATALOG_BRANDS.map((b) => b.slug)
    assert.equal(new Set(slugs).size, slugs.length)
  })
})
