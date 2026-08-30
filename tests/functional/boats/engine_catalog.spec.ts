import EngineCatalogSeeder from '#database/seeders/engine_catalog_seeder'
import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import EngineCatalogService from '#services/engine_catalog_service'
import {
  equipmentBodyToEnginePayload,
  storeBoatEngineValidator,
  updateBoatEngineValidator,
} from '#validators/boat_equipment'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

/**
 * Catalogue de marques et modèles de motorisation (#573).
 *
 * L'invariant de l'épic est vérifié explicitement : une saisie hors catalogue
 * reste acceptée par les deux validators et n'est jamais réécrite.
 */
async function seedBrands() {
  const volvo = await EngineBrand.create({
    slug: 'volvo-penta',
    name: 'Volvo Penta',
    country: 'SE',
    families: ['inboard_diesel', 'inboard_petrol'],
    aliases: ['volvo', 'vp', 'penta'],
    isActive: true,
  })
  const evinrude = await EngineBrand.create({
    slug: 'johnson-evinrude',
    name: 'Johnson / Evinrude',
    country: 'US',
    families: ['outboard_thermal'],
    aliases: ['johnson', 'evinrude', 'omc'],
    isActive: true,
  })
  const mercruiser = await EngineBrand.create({
    slug: 'mercruiser',
    name: 'MerCruiser',
    country: 'US',
    families: ['inboard_petrol'],
    aliases: ['mercruiser', 'mercury mercruiser'],
    isActive: true,
  })
  const mercury = await EngineBrand.create({
    slug: 'mercury-mariner',
    name: 'Mercury',
    country: 'US',
    families: ['outboard_thermal'],
    aliases: ['mercury', 'mariner'],
    isActive: true,
  })
  const retired = await EngineBrand.create({
    slug: 'motoriste-disparu',
    name: 'Motoriste Disparu',
    families: ['inboard_diesel'],
    isActive: false,
  })

  await EngineModel.createMany([
    {
      engineBrandId: volvo.id,
      slug: 'd2-40',
      name: 'D2-40',
      modelCode: 'D2-40',
      family: 'inboard_diesel',
      powerHp: 40,
      fuel: 'diesel',
    },
    {
      engineBrandId: volvo.id,
      slug: 'd1-30',
      name: 'D1-30',
      modelCode: 'D1-30',
      family: 'inboard_diesel',
      powerHp: 28,
      fuel: 'diesel',
    },
    {
      engineBrandId: volvo.id,
      slug: 'v8-350',
      name: 'V8-350',
      family: 'inboard_petrol',
      powerHp: 350,
      fuel: 'essence',
    },
    {
      engineBrandId: evinrude.id,
      slug: 'e-tec-60',
      name: 'E-TEC 60',
      family: 'outboard_thermal',
      powerHp: 60,
      strokeType: '2_stroke',
      fuel: 'essence',
    },
  ])

  return { volvo, evinrude, mercruiser, mercury, retired }
}

test.group('EngineCatalogService — listBrands', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('priorise la famille choisie sans jamais s’y limiter', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const brands = await service.listBrands({ family: 'outboard_thermal' })

    assert.includeMembers(
      brands.slice(0, 2).map((brand) => brand.slug),
      ['johnson-evinrude', 'mercury-mariner']
    )
    // Volvo Penta n'est pas un hors-bord et reste pourtant proposé.
    assert.isTrue(brands.some((brand) => brand.slug === 'volvo-penta'))
  })

  test('trie par nom quand aucune famille n’est choisie', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const brands = await service.listBrands()
    const names = brands.map((brand) => brand.name)

    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b))
    )
  })

  test('exclut les marques inactives et filtre sur la recherche', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const all = await service.listBrands()
    assert.isFalse(all.some((brand) => brand.slug === 'motoriste-disparu'))

    const searched = await service.listBrands({ q: 'volvo' })
    assert.lengthOf(searched, 1)
    assert.equal(searched[0].slug, 'volvo-penta')
  })
})

test.group('EngineCatalogService — listModels', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('renvoie les modèles de la marque, triés par nom, avec de quoi pré-remplir', async ({
    assert,
  }) => {
    const { volvo } = await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const models = await service.listModels({ brandId: volvo.id })

    assert.deepEqual(
      models.map((model) => model.name),
      ['D1-30', 'D2-40', 'V8-350']
    )
    const d240 = models.find((model) => model.slug === 'd2-40')
    assert.equal(d240?.powerHp, 40)
    assert.equal(d240?.fuel, 'diesel')
    assert.equal(d240?.modelCode, 'D2-40')
  })

  test('ne renvoie jamais les modèles d’une autre marque', async ({ assert }) => {
    const { evinrude } = await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const models = await service.listModels({ brandId: evinrude.id })

    assert.lengthOf(models, 1)
    assert.equal(models[0].slug, 'e-tec-60')
  })
})

test.group('EngineCatalogService — resolveBrand', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('rapproche les orthographes réellement rencontrées', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    for (const input of ['Volvo Penta', 'volvo', 'VOLVO', 'VP', 'Penta']) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, 'volvo-penta', `échec sur « ${input} »`)
    }
  })

  // Cas historiques de `resolveSparePartsBrand()` (#517), que le catalogue
  // remplace : la marque est noyée dans une saisie plus large.
  test('retrouve une marque noyée dans une saisie plus large', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['EVINRUDE 6cv', 'johnson-evinrude'],
      ['Mariner', 'mercury-mariner'],
      ['Volvo Penta D2-40', 'volvo-penta'],
      ['moteur OMC de 1985', 'johnson-evinrude'],
    ]

    for (const [input, expected] of cases) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, expected, `échec sur « ${input} »`)
    }
  })

  test('retient la correspondance la plus spécifique', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    // `mercury` et `mercury mercruiser` matchent tous deux : c'est le groupe de
    // mots le plus long qui doit gagner.
    const brand = await service.resolveBrand('Mercury MerCruiser 5.7')
    assert.equal(brand?.slug, 'mercruiser')
  })

  test('renvoie null hors catalogue — la saisie libre reste intacte', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    assert.isNull(await service.resolveBrand('Moteur de mon oncle'))
    assert.isNull(await service.resolveBrand('—'))
    assert.isNull(await service.resolveBrand(''))
    assert.isNull(await service.resolveBrand(null))
  })
})

test.group('EngineCatalogService — formProps', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('charge les modèles de la marque demandée par le rechargement partiel', async ({
    assert,
  }) => {
    const { volvo } = await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const props = await service.formProps(String(volvo.id))

    assert.equal(props.engineCatalogBrandId, volvo.id)
    assert.lengthOf(props.engineCatalogModels, 3)
  })

  test('rapproche la marque déjà saisie quand aucune n’est demandée', async ({ assert }) => {
    const { volvo } = await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const props = await service.formProps(undefined, 'Volvo')

    assert.equal(props.engineCatalogBrandId, volvo.id)
    assert.lengthOf(props.engineCatalogModels, 3)
  })

  test('renvoie un catalogue de modèles vide pour une saisie hors catalogue', async ({
    assert,
  }) => {
    await seedBrands()
    const service = await app.container.make(EngineCatalogService)

    const props = await service.formProps(undefined, 'Moteur de mon oncle')

    assert.isNull(props.engineCatalogBrandId)
    assert.isEmpty(props.engineCatalogModels)
    // Les marques restent proposées : la saisie libre n'éteint pas le catalogue.
    assert.isNotEmpty(props.engineBrands)
  })
})

test.group('Validators moteur — rattachement au catalogue', () => {
  test('acceptent toujours une marque et un modèle hors catalogue', async ({ assert }) => {
    for (const validator of [storeBoatEngineValidator, updateBoatEngineValidator]) {
      const body = await validator.validate({
        kind: 'outboard',
        brand: 'Moteur de mon oncle',
        model: 'Prototype 1987',
      })

      const payload = equipmentBodyToEnginePayload(body)
      assert.equal(payload.brand, 'Moteur de mon oncle')
      assert.equal(payload.model, 'Prototype 1987')
      assert.isNull(payload.engineModelId)
    }
  })

  test('normalisent le rattachement au catalogue', async ({ assert }) => {
    const body = await storeBoatEngineValidator.validate({
      kind: 'inboard',
      brand: 'Volvo Penta',
      model: 'D2-40',
      engineModelId: '42',
    })

    assert.equal(equipmentBodyToEnginePayload(body).engineModelId, 42)
  })

  test('neutralisent un rattachement aberrant sans faire échouer la saisie', async ({ assert }) => {
    for (const engineModelId of ['', '0', '-3', 'abc']) {
      const body = await storeBoatEngineValidator.validate({ kind: 'inboard', engineModelId })
      assert.isNull(
        equipmentBodyToEnginePayload(body).engineModelId,
        `échec sur « ${engineModelId} »`
      )
    }
  })
})

test.group('EngineCatalogSeeder — idempotence', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('rejoué deux fois, ne crée ni doublon ni suppression', async ({ assert }) => {
    const seeder = new EngineCatalogSeeder(db.connection())

    await seeder.run()
    const brandsAfterFirst = await EngineBrand.query().count('* as total')
    const modelsAfterFirst = await EngineModel.query().count('* as total')

    // Une marque hors corpus (ajoutée à la main, ou retirée des fichiers de
    // données) ne doit pas être emportée par un second passage : elle peut être
    // référencée par un moteur existant.
    const custom = await EngineBrand.create({
      slug: 'motoriste-hors-corpus',
      name: 'Motoriste hors corpus',
      families: ['inboard_diesel'],
      isActive: true,
    })

    await seeder.run()

    const brandsAfterSecond = await EngineBrand.query().count('* as total')
    const modelsAfterSecond = await EngineModel.query().count('* as total')

    assert.equal(
      Number(brandsAfterSecond[0].$extras.total),
      Number(brandsAfterFirst[0].$extras.total) + 1
    )
    assert.equal(
      Number(modelsAfterSecond[0].$extras.total),
      Number(modelsAfterFirst[0].$extras.total)
    )
    assert.isNotNull(await EngineBrand.find(custom.id))
  }).timeout(120_000)

  test('insère un corpus conforme aux volumes v1', async ({ assert }) => {
    const seeder = new EngineCatalogSeeder(db.connection())
    await seeder.run()

    const [{ $extras: brands }] = await EngineBrand.query().count('* as total')
    const [{ $extras: models }] = await EngineModel.query().count('* as total')

    assert.isAtLeast(Number(brands.total), 70)
    assert.isAtLeast(Number(models.total), 900)
  }).timeout(120_000)

  test('le corpus seedé résout les marques réellement saisies par les seeders', async ({
    assert,
  }) => {
    await new EngineCatalogSeeder(db.connection()).run()
    const service = await app.container.make(EngineCatalogService)

    // Valeurs présentes dans `malo_seeder.ts` et `sandbox_seeder.ts`.
    const seeded: ReadonlyArray<readonly [string, string]> = [
      ['Yamaha', 'yamaha'],
      ['Volvo', 'volvo-penta'],
      ['Mercury', 'mercury-mariner'],
    ]

    for (const [input, expected] of seeded) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, expected, `échec sur « ${input} »`)
    }
  }).timeout(120_000)
})
