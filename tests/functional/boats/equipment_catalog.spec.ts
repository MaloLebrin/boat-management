import EquipmentCatalogSeeder from '#database/seeders/equipment_catalog_seeder'
import { BoatFactory } from '#database/factories/boat_factory'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import EquipmentBrand from '#models/equipment_brand'
import EquipmentModel from '#models/equipment_model'
import EquipmentCatalogService from '#services/equipment_catalog_service'
import { GENERIC_EQUIPMENT_CATEGORIES } from '#shared/types/boat'
import { GENERIC_EQUIPMENT_CATEGORY_OPTIONS } from '#shared/constants/boats/boat_form_options'
import {
  createGenericEquipmentValidator,
  parseEquipmentCatalogId,
  updateGenericEquipmentValidator,
} from '#validators/boat_generic_equipment'
import { createAdminUser } from '#tests/functional/helpers'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

/**
 * Catalogue de marques et modèles d'équipements génériques (#577).
 *
 * L'invariant de la série (#571, #573, #577) est vérifié explicitement : une
 * saisie hors catalogue reste acceptée par les deux validators et n'est jamais
 * réécrite.
 */
async function seedBrands() {
  const garmin = await EquipmentBrand.create({
    slug: 'garmin',
    name: 'Garmin',
    country: 'US',
    categories: ['navigation'],
    aliases: ['garmin marine'],
    isActive: true,
  })
  const dometic = await EquipmentBrand.create({
    slug: 'dometic',
    name: 'Dometic',
    country: 'SE',
    categories: ['comfort'],
    aliases: ['waeco', 'dometic waeco'],
    isActive: true,
  })
  const lewmar = await EquipmentBrand.create({
    slug: 'lewmar',
    name: 'Lewmar',
    country: 'GB',
    categories: ['anchoring', 'deck'],
    aliases: [],
    isActive: true,
  })
  const isotherm = await EquipmentBrand.create({
    slug: 'isotherm',
    name: 'Isotherm',
    country: 'IT',
    categories: ['comfort'],
    aliases: ['indel', 'indel webasto'],
    isActive: true,
  })
  const retired = await EquipmentBrand.create({
    slug: 'marque-disparue',
    name: 'Marque Disparue',
    categories: ['deck'],
    aliases: null,
    isActive: false,
  })

  await EquipmentModel.createMany([
    {
      equipmentBrandId: garmin.id,
      slug: 'gpsmap-923',
      name: 'GPSMAP 923',
      category: 'navigation',
    },
    {
      equipmentBrandId: garmin.id,
      slug: 'echomap-uhd2-72sv',
      name: 'ECHOMAP UHD2 72sv',
      category: 'navigation',
    },
    {
      equipmentBrandId: lewmar.id,
      slug: 'v700',
      name: 'V700',
      category: 'anchoring',
    },
  ])

  return { garmin, dometic, lewmar, isotherm, retired }
}

test.group('EquipmentCatalogService — listBrands', (group) => {
  group.each.setup(() => truncateDb())

  test('priorise la catégorie choisie sans jamais s’y limiter', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const brands = await service.listBrands({ category: 'comfort' })

    assert.includeMembers(
      brands.slice(0, 2).map((brand) => brand.slug),
      ['dometic', 'isotherm']
    )
    // Garmin n'est pas du confort et reste pourtant proposé.
    assert.isTrue(brands.some((brand) => brand.slug === 'garmin'))
  })

  test('trie par nom quand aucune catégorie n’est choisie', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const brands = await service.listBrands()
    const names = brands.map((brand) => brand.name)

    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b))
    )
  })

  test('exclut les marques inactives et filtre sur la recherche', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const all = await service.listBrands()
    assert.isFalse(all.some((brand) => brand.slug === 'marque-disparue'))

    const searched = await service.listBrands({ q: 'garmin' })
    assert.lengthOf(searched, 1)
    assert.equal(searched[0].slug, 'garmin')
  })

  test('expose les alias — la liste du formulaire cherche comme resolveBrand', async ({
    assert,
  }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const brands = await service.listBrands()
    const dometic = brands.find((brand) => brand.slug === 'dometic')

    // Sans eux, `waeco` ne remonte rien dans le combobox alors que le serveur
    // sait rapprocher la saisie : la marque absorbée devient introuvable.
    assert.includeMembers(dometic?.aliases ?? [], ['waeco'])

    // Une marque sans alias en base retombe sur un tableau vide, jamais `null` :
    // le front itère dessus sans garde.
    const lewmar = brands.find((brand) => brand.slug === 'lewmar')
    assert.deepEqual(lewmar?.aliases, [])
  })
})

test.group('EquipmentCatalogService — listModels', (group) => {
  group.each.setup(() => truncateDb())

  test('renvoie les modèles de la marque, triés par nom', async ({ assert }) => {
    const { garmin } = await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const models = await service.listModels({ brandId: garmin.id })

    assert.deepEqual(
      models.map((model) => model.name),
      ['ECHOMAP UHD2 72sv', 'GPSMAP 923']
    )
    assert.equal(models[0].category, 'navigation')
  })

  test('ne renvoie jamais les modèles d’une autre marque', async ({ assert }) => {
    const { lewmar } = await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const models = await service.listModels({ brandId: lewmar.id })

    assert.lengthOf(models, 1)
    assert.equal(models[0].slug, 'v700')
  })
})

test.group('EquipmentCatalogService — resolveBrand', (group) => {
  group.each.setup(() => truncateDb())

  test('rapproche les orthographes réellement rencontrées', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    for (const input of ['Dometic', 'dometic', 'WAECO', 'waeco']) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, 'dometic', `échec sur « ${input} »`)
    }
  })

  test('retrouve une marque noyée dans une saisie plus large', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['VHF Garmin 115i', 'garmin'],
      ['frigo waeco 12V', 'dometic'],
      ['Guindeau Lewmar V700', 'lewmar'],
    ]

    for (const [input, expected] of cases) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, expected, `échec sur « ${input} »`)
    }
  })

  test('retient la correspondance la plus spécifique', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    // `indel` (alias Isotherm) et `indel webasto` matchent tous deux : c'est le
    // groupe de mots le plus long qui doit gagner.
    const brand = await service.resolveBrand('Frigo Indel Webasto')
    assert.equal(brand?.slug, 'isotherm')
  })

  test('renvoie null hors catalogue — la saisie libre reste intacte', async ({ assert }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    assert.isNull(await service.resolveBrand('Bricolage de mon oncle'))
    assert.isNull(await service.resolveBrand('—'))
    assert.isNull(await service.resolveBrand(''))
    assert.isNull(await service.resolveBrand(null))
  })
})

test.group('EquipmentCatalogService — formProps', (group) => {
  group.each.setup(() => truncateDb())

  test('charge les modèles de la marque demandée par le rechargement partiel', async ({
    assert,
  }) => {
    const { garmin } = await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const props = await service.formProps(String(garmin.id))

    assert.equal(props.equipmentCatalogBrandId, garmin.id)
    assert.lengthOf(props.equipmentCatalogModels, 2)
  })

  test('rapproche la marque déjà saisie quand aucune n’est demandée', async ({ assert }) => {
    const { garmin } = await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const props = await service.formProps(undefined, 'Garmin')

    assert.equal(props.equipmentCatalogBrandId, garmin.id)
    assert.lengthOf(props.equipmentCatalogModels, 2)
  })

  test('renvoie un catalogue de modèles vide pour une saisie hors catalogue', async ({
    assert,
  }) => {
    await seedBrands()
    const service = await app.container.make(EquipmentCatalogService)

    const props = await service.formProps(undefined, 'Bricolage de mon oncle')

    assert.isNull(props.equipmentCatalogBrandId)
    assert.isEmpty(props.equipmentCatalogModels)
    // Les marques restent proposées : la saisie libre n'éteint pas le catalogue.
    assert.isNotEmpty(props.equipmentBrands)
  })
})

test.group('Validators équipement générique — catalogue et garde-fous (#577)', () => {
  test('acceptent toujours une marque et un modèle hors catalogue', async ({ assert }) => {
    for (const validator of [createGenericEquipmentValidator, updateGenericEquipmentValidator]) {
      const body = await validator.validate({
        category: 'navigation',
        name: 'Sondeur du bord',
        brand: 'Bricolage de mon oncle',
        model: 'Prototype 1987',
      })

      assert.equal(body.brand, 'Bricolage de mon oncle')
      assert.equal(body.model, 'Prototype 1987')
      assert.isNull(parseEquipmentCatalogId(body.equipmentModelId))
    }
  })

  test('normalisent le rattachement au catalogue', async ({ assert }) => {
    const body = await createGenericEquipmentValidator.validate({
      category: 'navigation',
      name: 'Traceur',
      brand: 'Garmin',
      model: 'GPSMAP 923',
      equipmentModelId: '42',
    })

    assert.equal(parseEquipmentCatalogId(body.equipmentModelId), 42)
  })

  test('neutralisent un rattachement aberrant sans faire échouer la saisie', async ({ assert }) => {
    for (const equipmentModelId of ['', '0', '-3', 'abc']) {
      const body = await createGenericEquipmentValidator.validate({
        category: 'deck',
        name: 'Winch',
        equipmentModelId,
      })
      assert.isNull(
        parseEquipmentCatalogId(body.equipmentModelId),
        `échec sur « ${equipmentModelId} »`
      )
    }
  })

  test('plafonnent brand/model à 120 et notes à 5000, comme le validator moteur', async ({
    assert,
  }) => {
    await assert.rejects(() =>
      createGenericEquipmentValidator.validate({
        category: 'navigation',
        name: 'Traceur',
        brand: 'x'.repeat(121),
      })
    )
    await assert.rejects(() =>
      createGenericEquipmentValidator.validate({
        category: 'navigation',
        name: 'Traceur',
        model: 'x'.repeat(121),
      })
    )
    await assert.rejects(() =>
      createGenericEquipmentValidator.validate({
        category: 'navigation',
        name: 'Traceur',
        notes: 'x'.repeat(5001),
      })
    )
  })

  test('acceptent les nouvelles catégories et refusent une catégorie inconnue', async ({
    assert,
  }) => {
    for (const category of ['energy', 'comfort', 'plumbing']) {
      const body = await createGenericEquipmentValidator.validate({
        category,
        name: 'Équipement',
      })
      assert.equal(body.category, category)
    }

    await assert.rejects(() =>
      createGenericEquipmentValidator.validate({ category: 'galley', name: 'Équipement' })
    )
  })

  test('les options partagées suivent la constante des catégories', ({ assert }) => {
    // `GENERIC_EQUIPMENT_CATEGORY_OPTIONS` est la liste des selects : un slug
    // ajouté à la constante sans son option (ou l'inverse) casserait la parité
    // entre le validator et le formulaire.
    assert.deepEqual(
      GENERIC_EQUIPMENT_CATEGORY_OPTIONS.map((o) => o.value),
      [...GENERIC_EQUIPMENT_CATEGORIES]
    )
  })
})

test.group('Équipement générique — édition de catégorie et rattachement (#577)', (group) => {
  group.each.setup(() => truncateDb())

  test('PUT change la catégorie d’un équipement existant', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const item = await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'deck',
      name: 'Guindeau électrique',
      status: 'ok',
    })

    const response = await client
      .put(`/boats/${boat.id}/generic-equipment/${item.id}`)
      .form({ category: 'anchoring', name: 'Guindeau électrique' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    await item.refresh()
    assert.equal(item.category, 'anchoring')
  })

  test('POST rattache l’équipement au modèle du catalogue, saisie libre conservée', async ({
    client,
    assert,
  }) => {
    const { garmin } = await seedBrands()
    const model = await EquipmentModel.findByOrFail('slug', 'gpsmap-923')
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/generic-equipment`)
      .form({
        category: 'navigation',
        name: 'Traceur du bord',
        brand: garmin.name,
        model: model.name,
        equipmentModelId: String(model.id),
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const [item] = await BoatGenericEquipment.query().where('boat_id', boat.id)
    assert.equal(item.equipmentModelId, model.id)
    // `brand`/`model` restent la source de vérité, pas une projection du
    // catalogue.
    assert.equal(item.brand, 'Garmin')
    assert.equal(item.model, 'GPSMAP 923')
  })

  test('supprimer le modèle du catalogue détache sans perdre la saisie (SET NULL)', async ({
    assert,
  }) => {
    await seedBrands()
    const model = await EquipmentModel.findByOrFail('slug', 'gpsmap-923')
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const item = await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'navigation',
      name: 'Traceur du bord',
      brand: 'Garmin',
      model: 'GPSMAP 923',
      equipmentModelId: model.id,
      status: 'ok',
    })

    await model.delete()
    await item.refresh()

    assert.isNull(item.equipmentModelId)
    assert.equal(item.brand, 'Garmin')
    assert.equal(item.model, 'GPSMAP 923')
  })
})

test.group('EquipmentCatalogSeeder — idempotence (#577)', (group) => {
  group.each.setup(() => truncateDb())

  test('rejoué deux fois, ne crée ni doublon ni suppression', async ({ assert }) => {
    const seeder = new EquipmentCatalogSeeder(db.connection())

    await seeder.run()
    const brandsAfterFirst = await EquipmentBrand.query().count('* as total')
    const modelsAfterFirst = await EquipmentModel.query().count('* as total')

    // Une marque hors corpus (ajoutée à la main, ou retirée des fichiers de
    // données) ne doit pas être emportée par un second passage : elle peut être
    // référencée par `boat_generic_equipment.equipment_model_id`.
    const custom = await EquipmentBrand.create({
      slug: 'marque-hors-corpus',
      name: 'Marque hors corpus',
      categories: ['deck'],
      isActive: true,
    })

    await seeder.run()

    const brandsAfterSecond = await EquipmentBrand.query().count('* as total')
    const modelsAfterSecond = await EquipmentModel.query().count('* as total')

    assert.equal(
      Number(brandsAfterSecond[0].$extras.total),
      Number(brandsAfterFirst[0].$extras.total) + 1
    )
    assert.equal(
      Number(modelsAfterSecond[0].$extras.total),
      Number(modelsAfterFirst[0].$extras.total)
    )
    assert.isNotNull(await EquipmentBrand.find(custom.id))
  }).timeout(120_000)

  test('insère un corpus conforme aux volumes v1, toutes catégories couvertes', async ({
    assert,
  }) => {
    const seeder = new EquipmentCatalogSeeder(db.connection())
    await seeder.run()

    const [{ $extras: brands }] = await EquipmentBrand.query().count('* as total')
    assert.isAtLeast(Number(brands.total), 120)

    // Chaque catégorie du vocabulaire doit être représentée par au moins une
    // marque — c'est le critère d'acceptation de l'issue.
    const rows = await EquipmentBrand.query().select(['categories'])
    const covered = new Set(rows.flatMap((row) => row.categories))
    for (const category of GENERIC_EQUIPMENT_CATEGORIES) {
      assert.isTrue(covered.has(category), `catégorie « ${category} » sans marque`)
    }
  }).timeout(120_000)

  test('le corpus seedé résout des saisies libres réalistes', async ({ assert }) => {
    await new EquipmentCatalogSeeder(db.connection()).run()
    const service = await app.container.make(EquipmentCatalogService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['Garmin', 'garmin'],
      ['VHF ICOM', 'icom'],
      ['waeco', 'dometic'],
      ['Victron', 'victron-energy'],
      ['guindeau Lofrans', 'lofrans'],
      ['Watt & Sea', 'watt-and-sea'],
    ]

    for (const [input, expected] of cases) {
      const brand = await service.resolveBrand(input)
      assert.equal(brand?.slug, expected, `échec sur « ${input} »`)
    }
  }).timeout(120_000)
})
