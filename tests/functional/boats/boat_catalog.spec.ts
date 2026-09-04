import BoatBrand from '#models/boat_brand'
import BoatModel from '#models/boat_model'
import BoatCatalogService from '#services/boat_catalog_service'
import BoatCatalogSeeder from '#database/seeders/boat_catalog_seeder'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { truncateDb } from '#tests/utils/db'
import { test } from '@japa/runner'

/**
 * Catalogue de marques et modèles de bateau (#571).
 *
 * L'invariant du lot est vérifié explicitement : une saisie hors catalogue
 * reste acceptée par les deux validators et n'est jamais réécrite.
 */
async function seedBrands() {
  const beneteau = await BoatBrand.create({
    slug: 'beneteau',
    name: 'Bénéteau',
    country: 'FR',
    categories: ['sailboat_monohull', 'motor_yacht'],
    aliases: ['beneteau', 'Chantiers Bénéteau'],
    isActive: true,
  })
  const zodiac = await BoatBrand.create({
    slug: 'zodiac',
    name: 'Zodiac',
    country: 'FR',
    categories: ['rib'],
    aliases: ['zodiac'],
    isActive: true,
  })
  const retired = await BoatBrand.create({
    slug: 'chantier-disparu',
    name: 'Chantier Disparu',
    categories: ['sailboat_monohull'],
    isActive: false,
  })

  await BoatModel.createMany([
    {
      boatBrandId: beneteau.id,
      slug: 'oceanis-46-1',
      name: 'Oceanis 46.1',
      category: 'sailboat_monohull',
    },
    { boatBrandId: beneteau.id, slug: 'first-36', name: 'First 36', category: 'sailboat_monohull' },
    { boatBrandId: beneteau.id, slug: 'antares-7', name: 'Antares 7', category: 'motor_yacht' },
    { boatBrandId: zodiac.id, slug: 'medline-7-5', name: 'Medline 7.5', category: 'rib' },
  ])

  return { beneteau, zodiac, retired }
}

test.group('BoatCatalogService — listBrands', (group) => {
  group.each.setup(() => truncateDb())

  test('priorise la catégorie choisie sans jamais s’y limiter', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    const brands = await service.listBrands({ category: 'rib' })

    assert.equal(brands[0].slug, 'zodiac')
    // Bénéteau n'est pas dans la catégorie « rib » et reste pourtant proposé.
    assert.isTrue(brands.some((b) => b.slug === 'beneteau'))
  })

  test('trie par nom quand aucune catégorie n’est choisie', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    const brands = await service.listBrands()
    const names = brands.map((b) => b.name)

    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b))
    )
  })

  test('exclut les marques inactives et filtre sur la recherche', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    const all = await service.listBrands()
    assert.isFalse(all.some((b) => b.slug === 'chantier-disparu'))

    const searched = await service.listBrands({ q: 'zod' })
    assert.lengthOf(searched, 1)
    assert.equal(searched[0].slug, 'zodiac')
  })
})

test.group('BoatCatalogService — listModels', (group) => {
  group.each.setup(() => truncateDb())

  test('renvoie les modèles de la marque, triés par nom', async ({ assert }) => {
    const { beneteau } = await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    const models = await service.listModels({ brandId: beneteau.id })

    assert.deepEqual(
      models.map((m) => m.name),
      ['Antares 7', 'First 36', 'Oceanis 46.1']
    )
  })

  test('ne renvoie jamais les modèles d’une autre marque', async ({ assert }) => {
    const { zodiac } = await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    const models = await service.listModels({ brandId: zodiac.id })

    assert.lengthOf(models, 1)
    assert.equal(models[0].slug, 'medline-7-5')
  })
})

test.group('BoatCatalogService — resolveBrand', (group) => {
  group.each.setup(() => truncateDb())

  test('rapproche les orthographes réellement rencontrées', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    for (const input of ['Beneteau', 'BENETEAU', 'bénéteau', 'Bénéteau', 'Chantiers Bénéteau']) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, 'beneteau', `échec sur « ${input} »`)
    }
  })

  test('renvoie null hors catalogue — la saisie libre reste intacte', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(BoatCatalogService)

    assert.isNull(await service.resolveBrand('Chantier de mon oncle'))
    assert.isNull(await service.resolveBrand(''))
    assert.isNull(await service.resolveBrand(null))
  })
})

test.group('Validators bateau — catégorie', () => {
  test('acceptent une catégorie du vocabulaire', async ({ assert }) => {
    for (const validator of [createBoatValidator, updateBoatValidator]) {
      const payload = await validator.validate({ name: 'Liberté', category: 'sailboat_monohull' })
      assert.equal(payload.category, 'sailboat_monohull')
    }
  })

  test('rejettent une catégorie hors vocabulaire', async ({ assert }) => {
    for (const validator of [createBoatValidator, updateBoatValidator]) {
      await assert.rejects(() => validator.validate({ name: 'Liberté', category: 'voilier' }))
    }
  })

  test('acceptent toujours un constructeur et un modèle hors catalogue', async ({ assert }) => {
    for (const validator of [createBoatValidator, updateBoatValidator]) {
      const payload = await validator.validate({
        name: 'Liberté',
        category: 'other',
        manufacturer: 'Chantier de mon oncle',
        model: 'Prototype 1987',
      })
      assert.equal(payload.manufacturer, 'Chantier de mon oncle')
      assert.equal(payload.model, 'Prototype 1987')
    }
  })

  test('acceptent un bateau sans catégorie — aucun existant ne devient invalide', async ({
    assert,
  }) => {
    for (const validator of [createBoatValidator, updateBoatValidator]) {
      const payload = await validator.validate({ name: 'Liberté' })
      assert.isUndefined(payload.category)
    }
  })
})

test.group('BoatCatalogSeeder — idempotence', (group) => {
  group.each.setup(() => truncateDb())

  test('rejoué deux fois, ne crée ni doublon ni suppression', async ({ assert }) => {
    const seeder = new BoatCatalogSeeder(db.connection())

    await seeder.run()
    const brandsAfterFirst = await BoatBrand.query().count('* as total')
    const modelsAfterFirst = await BoatModel.query().count('* as total')

    // Une marque hors corpus (ajoutée à la main, ou retirée des fichiers de
    // données) ne doit pas être emportée par un second passage.
    const custom = await BoatBrand.create({
      slug: 'chantier-hors-corpus',
      name: 'Chantier hors corpus',
      categories: ['other'],
      isActive: true,
    })

    await seeder.run()

    const brandsAfterSecond = await BoatBrand.query().count('* as total')
    const modelsAfterSecond = await BoatModel.query().count('* as total')

    assert.equal(
      Number(brandsAfterSecond[0].$extras.total),
      Number(brandsAfterFirst[0].$extras.total) + 1
    )
    assert.equal(
      Number(modelsAfterSecond[0].$extras.total),
      Number(modelsAfterFirst[0].$extras.total)
    )
    assert.isNotNull(await BoatBrand.find(custom.id))
  }).timeout(120_000)

  test('insère un corpus conforme aux volumes v1', async ({ assert }) => {
    const seeder = new BoatCatalogSeeder(db.connection())
    await seeder.run()

    const [{ $extras: brands }] = await BoatBrand.query().count('* as total')
    const [{ $extras: models }] = await BoatModel.query().count('* as total')

    assert.isAtLeast(Number(brands.total), 250)
    assert.isAtLeast(Number(models.total), 2000)
  }).timeout(120_000)
})
