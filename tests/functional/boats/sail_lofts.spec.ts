import SailLoftSeeder from '#database/seeders/sail_loft_seeder'
import { BoatFactory } from '#database/factories/boat_factory'
import BoatSail from '#models/boat_sail'
import SailLoft from '#models/sail_loft'
import SailLoftService from '#services/sail_loft_service'
import {
  equipmentBodyToSailPayload,
  storeBoatSailValidator,
  updateBoatSailValidator,
} from '#validators/boat_equipment'
import { createAdminUser } from '#tests/functional/helpers'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

/**
 * Voilerie et matériau normalisés sur les voiles (#578).
 *
 * L'invariant de la série (#571, #573, #577) est vérifié explicitement : une
 * voilerie hors référentiel reste acceptée par les deux validators et n'est
 * jamais réécrite.
 */
async function seedLofts() {
  const north = await SailLoft.create({
    slug: 'north-sails',
    name: 'North Sails',
    country: 'US',
    aliases: ['north'],
    isActive: true,
  })
  const elvstrom = await SailLoft.create({
    slug: 'elvstrom-sails',
    name: 'Elvström Sails',
    country: 'DK',
    aliases: ['elvstrom'],
    isActive: true,
  })
  const incidence = await SailLoft.create({
    slug: 'incidence-sails',
    name: 'Incidence Sails',
    country: 'FR',
    aliases: ['incidence', 'incidences', 'incidence voiles'],
    isActive: true,
  })
  const pb = await SailLoft.create({
    slug: 'pinnell-and-bax',
    name: 'Pinnell & Bax',
    country: 'GB',
    aliases: ['p&b', 'p and b'],
    isActive: true,
  })
  const retired = await SailLoft.create({
    slug: 'voilerie-disparue',
    name: 'Voilerie Disparue',
    aliases: null,
    isActive: false,
  })

  return { north, elvstrom, incidence, pb, retired }
}

test.group('SailLoftService — listLofts', (group) => {
  group.each.setup(() => truncateDb())

  test('trie par nom et exclut les voileries inactives', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const lofts = await service.listLofts()
    const names = lofts.map((loft) => loft.name)

    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b))
    )
    assert.isFalse(lofts.some((loft) => loft.slug === 'voilerie-disparue'))
  })

  test('filtre sur la recherche', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const searched = await service.listLofts({ q: 'north' })
    assert.lengthOf(searched, 1)
    assert.equal(searched[0].slug, 'north-sails')
  })

  test('expose les alias — la combobox cherche comme resolveLoft', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const lofts = await service.listLofts()
    const elvstrom = lofts.find((loft) => loft.slug === 'elvstrom-sails')

    // Sans eux, `elvstrom` ne remonte rien dans la combobox alors que le
    // serveur sait rapprocher la saisie.
    assert.includeMembers(elvstrom?.aliases ?? [], ['elvstrom'])

    // Une voilerie sans alias en base retombe sur un tableau vide, jamais
    // `null` : le front itère dessus sans garde.
    await SailLoft.create({ slug: 'sans-alias', name: 'Sans Alias', aliases: null, isActive: true })
    const reloaded = await service.listLofts()
    assert.deepEqual(reloaded.find((loft) => loft.slug === 'sans-alias')?.aliases, [])
  })
})

test.group('SailLoftService — resolveLoft', (group) => {
  group.each.setup(() => truncateDb())

  test('rapproche les orthographes réellement rencontrées', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['North Sails', 'north-sails'],
      ['north-sails', 'north-sails'],
      ['Elvström Sails', 'elvstrom-sails'],
      ['ELVSTROM', 'elvstrom-sails'],
      ['incidences', 'incidence-sails'],
      ['P&B', 'pinnell-and-bax'],
    ]

    for (const [input, expected] of cases) {
      const loft = await service.resolveLoft(input)
      assert.equal(loft?.slug, expected, `échec sur « ${input} »`)
    }
  })

  test('retrouve une voilerie noyée dans une saisie plus large', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['GV North Sails 2021', 'north-sails'],
      ['Génois Incidence tri-radial', 'incidence-sails'],
    ]

    for (const [input, expected] of cases) {
      const loft = await service.resolveLoft(input)
      assert.equal(loft?.slug, expected, `échec sur « ${input} »`)
    }
  })

  test('renvoie null hors référentiel — la saisie libre reste intacte', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    assert.isNull(await service.resolveLoft('Voilerie du port'))
    assert.isNull(await service.resolveLoft('—'))
    assert.isNull(await service.resolveLoft(''))
    assert.isNull(await service.resolveLoft(null))
  })
})

test.group('SailLoftService — formProps', (group) => {
  group.each.setup(() => truncateDb())

  test('réémet le rattachement déjà posé sur la voile', async ({ assert }) => {
    const { north } = await seedLofts()
    const service = await app.container.make(SailLoftService)

    const props = await service.formProps({ sailLoftId: north.id, sailmaker: 'North Sails' })

    assert.equal(props.sailCatalogLoftId, north.id)
    assert.isNotEmpty(props.sailLofts)
  })

  test('rapproche le sailmaker déjà saisi quand la voile n’est pas rattachée', async ({
    assert,
  }) => {
    const { elvstrom } = await seedLofts()
    const service = await app.container.make(SailLoftService)

    const props = await service.formProps({ sailLoftId: null, sailmaker: 'elvstrom' })

    assert.equal(props.sailCatalogLoftId, elvstrom.id)
  })

  test('renvoie null pour une saisie hors référentiel ou sans voile', async ({ assert }) => {
    await seedLofts()
    const service = await app.container.make(SailLoftService)

    const outOfCatalog = await service.formProps({
      sailLoftId: null,
      sailmaker: 'Voilerie du port',
    })
    assert.isNull(outOfCatalog.sailCatalogLoftId)
    // Les voileries restent proposées : la saisie libre n'éteint pas le référentiel.
    assert.isNotEmpty(outOfCatalog.sailLofts)

    const withoutSail = await service.formProps()
    assert.isNull(withoutSail.sailCatalogLoftId)
  })
})

test.group('Validators voile — matériau et voilerie (#578)', () => {
  test('acceptent toujours une voilerie hors référentiel', async ({ assert }) => {
    for (const validator of [storeBoatSailValidator, updateBoatSailValidator]) {
      const body = await validator.validate({
        sailType: 'main',
        sailmaker: 'Voilerie du port',
      })
      assert.equal(body.sailmaker, 'Voilerie du port')
    }
  })

  test('acceptent un matériau du vocabulaire, vide ou absent', async ({ assert }) => {
    for (const material of ['dacron', 'nylon_spi', '', '__none__']) {
      const body = await storeBoatSailValidator.validate({ sailType: 'main', material })
      assert.equal(body.material, material)
    }
    const withoutMaterial = await storeBoatSailValidator.validate({ sailType: 'main' })
    assert.isUndefined(withoutMaterial.material)
  })

  test('refusent un matériau hors vocabulaire', async ({ assert }) => {
    await assert.rejects(() =>
      storeBoatSailValidator.validate({ sailType: 'main', material: 'kevlar' })
    )
    await assert.rejects(() =>
      updateBoatSailValidator.validate({ sailType: 'main', material: 'Dacron' })
    )
  })

  test('equipmentBodyToSailPayload normalise matériau, voilerie et rattachement', ({ assert }) => {
    const payload = equipmentBodyToSailPayload({
      sailType: 'main',
      material: '',
      sailmaker: '  ',
      sailLoftId: '12',
    })
    assert.isNull(payload.material)
    assert.isNull(payload.sailmaker)
    assert.equal(payload.sailLoftId, 12)

    assert.isNull(equipmentBodyToSailPayload({ sailType: 'main', material: '__none__' }).material)
    assert.equal(
      equipmentBodyToSailPayload({ sailType: 'main', material: 'dacron' }).material,
      'dacron'
    )

    // Un rattachement aberrant se neutralise en null, jamais en échec.
    for (const sailLoftId of ['', '0', '-3', 'abc']) {
      assert.isNull(
        equipmentBodyToSailPayload({ sailType: 'main', sailLoftId }).sailLoftId,
        `échec sur « ${sailLoftId} »`
      )
    }
  })
})

test.group('Voiles — persistance voilerie et rattachement (#578)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST persiste voilerie, rattachement, matériau et notes', async ({ client, assert }) => {
    const { incidence } = await seedLofts()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/sails`)
      .form({
        sailType: 'main',
        material: 'dacron',
        sailmaker: incidence.name,
        sailLoftId: String(incidence.id),
        // Bug préexistant corrigé au passage : `create()` ignorait les notes.
        notes: 'GV de 2021, retaillée en 2024',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const [sail] = await BoatSail.query().where('boat_id', boat.id)
    assert.equal(sail.sailmaker, 'Incidence Sails')
    assert.equal(sail.sailLoftId, incidence.id)
    assert.equal(sail.material, 'dacron')
    assert.equal(sail.notes, 'GV de 2021, retaillée en 2024')
  })

  test('POST neutralise un rattachement aberrant sans faire échouer la saisie', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/sails`)
      .form({ sailType: 'genoa', sailmaker: 'Voilerie du port', sailLoftId: 'abc' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const [sail] = await BoatSail.query().where('boat_id', boat.id)
    assert.equal(sail.sailmaker, 'Voilerie du port')
    assert.isNull(sail.sailLoftId)
  })

  test('PUT met à jour la voilerie et détache quand la saisie diverge', async ({
    client,
    assert,
  }) => {
    const { north } = await seedLofts()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sail = await BoatSail.create({
      boatId: boat.id,
      sailType: 'main',
      sailmaker: north.name,
      sailLoftId: north.id,
    })

    const response = await client
      .put(`/boats/${boat.id}/sails/${sail.id}`)
      .form({ sailType: 'main', sailmaker: 'Voilerie du port', sailLoftId: '' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    await sail.refresh()
    assert.equal(sail.sailmaker, 'Voilerie du port')
    assert.isNull(sail.sailLoftId)
  })

  test('supprimer la voilerie du référentiel détache sans perdre la saisie (SET NULL)', async ({
    assert,
  }) => {
    const { north } = await seedLofts()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sail = await BoatSail.create({
      boatId: boat.id,
      sailType: 'main',
      sailmaker: 'North Sails',
      sailLoftId: north.id,
    })

    await north.delete()
    await sail.refresh()

    assert.isNull(sail.sailLoftId)
    assert.equal(sail.sailmaker, 'North Sails')
  })
})

test.group('SailLoftSeeder — idempotence (#578)', (group) => {
  group.each.setup(() => truncateDb())

  test('rejoué deux fois, ne crée ni doublon ni suppression', async ({ assert }) => {
    const seeder = new SailLoftSeeder(db.connection())

    await seeder.run()
    const afterFirst = await SailLoft.query().count('* as total')
    assert.isAtLeast(Number(afterFirst[0].$extras.total), 40)

    // Une voilerie hors corpus ne doit pas être emportée par un second
    // passage : elle peut être référencée par `boat_sails.sail_loft_id`.
    const custom = await SailLoft.create({
      slug: 'voilerie-hors-corpus',
      name: 'Voilerie hors corpus',
      isActive: true,
    })

    await seeder.run()

    const afterSecond = await SailLoft.query().count('* as total')
    assert.equal(Number(afterSecond[0].$extras.total), Number(afterFirst[0].$extras.total) + 1)
    assert.isNotNull(await SailLoft.find(custom.id))
  }).timeout(120_000)

  test('resynchronise une entrée modifiée via updateOrCreate', async ({ assert }) => {
    const seeder = new SailLoftSeeder(db.connection())
    await seeder.run()

    const north = await SailLoft.findByOrFail('slug', 'north-sails')
    north.name = 'Nom trafiqué'
    await north.save()

    await seeder.run()
    await north.refresh()
    assert.equal(north.name, 'North Sails')
  }).timeout(120_000)

  test('le corpus seedé résout des saisies libres réalistes', async ({ assert }) => {
    await new SailLoftSeeder(db.connection()).run()
    const service = await app.container.make(SailLoftService)

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['North Sails', 'north-sails'],
      ['elvstrom', 'elvstrom-sails'],
      ['Incidence', 'incidence-sails'],
      ['Delta Voiles', 'delta-voiles'],
      ['GV Hood 2019', 'hood-sailmakers'],
    ]

    for (const [input, expected] of cases) {
      const loft = await service.resolveLoft(input)
      assert.equal(loft?.slug, expected, `échec sur « ${input} »`)
    }
  }).timeout(120_000)
})
