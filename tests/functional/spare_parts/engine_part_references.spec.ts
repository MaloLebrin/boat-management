import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import EnginePartReference from '#models/engine_part_reference'
import { YAMAHA_REFERENCE_PATTERN } from '#shared/helpers/spare_parts'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

/**
 * Références constructeur rattachées au modèle moteur (#575).
 *
 * L'invariant tenu ici est celui de #517 : **aucune référence ne s'affiche sans
 * sa source**. Il est vérifié à la racine — la colonne `source_label` refuse un
 * `NULL` — puis sur chaque sortie qui porte une référence : le panier et
 * l'export CSV.
 */
async function seedCatalog() {
  const yamaha = await EngineBrand.create({
    slug: 'yamaha',
    name: 'Yamaha',
    country: 'JP',
    families: ['outboard_thermal'],
    aliases: ['yamaha', 'yam'],
    isActive: true,
    plateLocationKey: 'parts.identify.plate.yamaha.location',
    plateExampleKey: 'parts.identify.plate.yamaha.example',
    referencePattern: YAMAHA_REFERENCE_PATTERN,
  })

  const model = await EngineModel.create({
    engineBrandId: yamaha.id,
    slug: '4as',
    name: '4AS',
    modelCode: '6E0',
    family: 'outboard_thermal',
    strokeType: '2_stroke',
    fuel: 'essence',
  })

  const reference = await EnginePartReference.create({
    engineModelId: model.id,
    partKey: 'lower-unit.impeller',
    reference: '6E0-44352-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  })

  return { yamaha, model, reference }
}

/** Moteur du catalogue : la saisie libre `Yamaha` / `4AS` se rapproche seule. */
async function makeCatalogEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '4AS',
  }).create()
}

test.group('Références constructeur — contrainte de source (#575)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('une référence sans source est refusée par la base', async ({ assert }) => {
    const { model } = await seedCatalog()

    await assert.rejects(() =>
      db.table('engine_part_references').insert({
        engine_model_id: model.id,
        part_key: 'lower-unit.water_pump_kit',
        reference: '6E0-W0078-00',
        source_label: null,
      })
    )
  })

  test('un couple (modèle, pièce) ne porte qu’une référence', async ({ assert }) => {
    const { model } = await seedCatalog()

    await assert.rejects(() =>
      EnginePartReference.create({
        engineModelId: model.id,
        partKey: 'lower-unit.impeller',
        reference: '6E0-44352-01',
        sourceLabel: 'Autre catalogue',
      })
    )
  })

  test('la suppression d’un modèle emporte ses références', async ({ assert }) => {
    const { model } = await seedCatalog()

    await model.delete()

    assert.lengthOf(await EnginePartReference.query().where('engineModelId', model.id), 0)
  })
})

test.group('Références constructeur — panier et export (#575)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('l’ajout au panier pré-remplit la référence connue', async ({ client, assert }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'lower-unit.impeller' })
      .redirects(0)

    response.assertStatus(302)
    const item = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .firstOrFail()
    assert.equal(item.reference, '6E0-44352-00')
  })

  test('la référence pré-remplie reste modifiable', async ({ client, assert }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    const baseUrl = `/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`
    await client.post(baseUrl).loginAs(user).form({ partKey: 'lower-unit.impeller' }).redirects(0)

    const item = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .firstOrFail()

    const response = await client
      .patch(`${baseUrl}/${item.id}`)
      .loginAs(user)
      .form({ reference: '6E0-44352-01' })
      .redirects(0)

    response.assertStatus(302)
    await item.refresh()
    assert.equal(item.reference, '6E0-44352-01')
  })

  test('une pièce sans référence connue entre au panier sans référence', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'lower-unit.water_pump_kit' })
      .redirects(0)

    const item = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .firstOrFail()
    assert.isNull(item.reference)
  })

  test('un moteur hors catalogue garde le parcours d’avant', async ({ client, assert }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      brand: 'Marque inconnue',
      model: 'XYZ-1',
    }).create()

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'lower-unit.impeller' })
      .redirects(0)

    const item = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .firstOrFail()
    assert.isNull(item.reference)
  })

  test('l’export CSV porte la référence et sa source', async ({ client, assert }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'lower-unit.impeller' })
      .redirects(0)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.text()
    assert.include(body, '6E0-44352-00')
    assert.include(body, 'Catalogue Partzilla — Yamaha')
  })

  test('une référence saisie à la main n’emprunte pas la source du catalogue', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'lower-unit.impeller',
      quantity: 1,
      reference: '68T-44352-00',
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    const body = response.text()
    assert.include(body, '68T-44352-00')
    assert.notInclude(body, 'Catalogue Partzilla — Yamaha')
  })
})

test.group('Références constructeur — écrans (#575)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('la page ensemble sert les références et le motif de décodage', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/lower-unit`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      partReferences: Array<{ reference: string; sourceLabel: string }>
      engine: { referencePattern: { template: string } | null }
    }

    assert.lengthOf(props.partReferences, 1)
    assert.equal(props.partReferences[0].reference, '6E0-44352-00')
    // Aucune référence ne quitte le serveur sans sa source.
    assert.isNotEmpty(props.partReferences[0].sourceLabel)
    assert.equal(props.engine.referencePattern?.template, YAMAHA_REFERENCE_PATTERN.template)
  })

  test('la page identification sert les aides plaque de la marque résolue', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      plateHints: Array<{ brandSlug: string; locationKey: string }>
      engine: { modelCodeMatches: number }
    }

    assert.lengthOf(props.plateHints, 1)
    assert.equal(props.plateHints[0].brandSlug, 'yamaha')
    assert.equal(props.engine.modelCodeMatches, 1)
  })

  test('un code plaque partagé par plusieurs modèles est signalé', async ({ client, assert }) => {
    const { yamaha } = await seedCatalog()
    // Second modèle sous le même code plaque : c'est le cas que la mise en
    // garde « le numéro de série départage les variantes » vise.
    await EngineModel.create({
      engineBrandId: yamaha.id,
      slug: '5c',
      name: '5C',
      modelCode: '6E0',
      family: 'outboard_thermal',
    })

    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeCatalogEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    const props = response.inertiaProps as { engine: { modelCodeMatches: number } }
    assert.equal(props.engine.modelCodeMatches, 2)
  })

  test('un moteur hors catalogue reçoit toutes les aides plaque connues', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      brand: 'Marque inconnue',
      model: 'XYZ-1',
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    const props = response.inertiaProps as {
      plateHints: Array<{ brandSlug: string }>
      partReferences: unknown[]
      engine: { referencePattern: unknown }
    }

    // Marque non résolue → on affiche tout ce qu'on sait, comme avant #575.
    assert.lengthOf(props.plateHints, 1)
    // Et rien d'autre ne change : ni référence, ni carte de décodage.
    assert.lengthOf(props.partReferences, 0)
    assert.isNull(props.engine.referencePattern)
  })
})
