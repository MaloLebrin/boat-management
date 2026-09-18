import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatEngine from '#models/boat_engine'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createMechanicUser, createMemberUser } from '#tests/functional/helpers'
import { assertFieldErrors } from '#tests/support/validation'

/**
 * Les deux mises à jour partielles de la fiche moteur (#692).
 *
 * `PATCH …/status` et `PATCH …/notes` n'étaient atteintes par aucun test : ce
 * sont les deux seules routes de la fiche moteur qui écrivent sans passer par
 * le formulaire complet, et donc les deux qui peuvent diverger du reste sans
 * que rien ne le signale.
 *
 * ⚠️ Les deux terminent par `response.redirect().back()`. Sans en-tête
 * `Referrer`, Adonis retombe sur `/` — l'URL de retour ne prouve donc rien ici,
 * et chaque cas est jugé sur ce qui est **écrit en base**, pas sur sa
 * redirection.
 */

/** Les quatre statuts du domaine (`app/validators/boat_equipment.ts`). */
const STATUSES = ['operational', 'in_maintenance', 'out_of_service', 'retired'] as const

async function seed() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    status: 'operational',
    notes: null,
  }).create()

  return { user, boat, engine }
}

test.group('Engine status — PATCH /boats/:boatId/engines/:engineId/status', (group) => {
  group.each.setup(() => truncateDb())

  for (const status of STATUSES) {
    test(`PATCH status accepte « ${status} » et le persiste`, async ({ client, assert }) => {
      const { user, boat, engine } = await seed()

      const response = await client
        .patch(`/boats/${boat.id}/engines/${engine.id}/status`)
        .loginAs(user)
        .form({ status })
        .redirects(0)

      response.assertStatus(302)

      const reloaded = await BoatEngine.findOrFail(engine.id)
      assert.equal(reloaded.status, status)
    })
  }

  test('PATCH status refuse une valeur hors enum et ne touche à rien', async ({
    client,
    assert,
  }) => {
    const { user, boat, engine } = await seed()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/status`)
      .loginAs(user)
      .form({ status: 'en_panne' })
      .redirects(0)

    assertFieldErrors(assert, response, ['status'])

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'operational')
  })

  test('PATCH status refuse un corps vide — le champ est requis', async ({ client, assert }) => {
    const { user, boat, engine } = await seed()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/status`)
      .loginAs(user)
      .form({})
      .redirects(0)

    assertFieldErrors(assert, response, ['status'])

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'operational')
  })
})

test.group('Engine notes — PATCH /boats/:boatId/engines/:engineId/notes', (group) => {
  group.each.setup(() => truncateDb())

  test('PATCH notes persiste le texte', async ({ client, assert }) => {
    const { user, boat, engine } = await seed()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/notes`)
      .loginAs(user)
      .form({ notes: 'Vidange faite au port de Lorient.' })
      .redirects(0)

    response.assertStatus(302)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.notes, 'Vidange faite au port de Lorient.')
  })

  test('PATCH notes sans champ efface la note — le validator est optional().nullable()', async ({
    client,
    assert,
  }) => {
    const { user, boat, engine } = await seed()
    engine.notes = 'Une note antérieure'
    await engine.save()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/notes`)
      .loginAs(user)
      .form({})
      .redirects(0)

    response.assertStatus(302)

    // `notes ?? null` côté contrôleur : un champ absent **efface**, il ne
    // conserve pas. Ce n'est pas anodin pour une route de mise à jour
    // partielle — c'est figé ici pour que le choix soit visible.
    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.isNull(reloaded.notes)
  })

  test('PATCH notes accepte 5000 caractères', async ({ client, assert }) => {
    const { user, boat, engine } = await seed()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/notes`)
      .loginAs(user)
      .form({ notes: 'a'.repeat(5000) })
      .redirects(0)

    response.assertStatus(302)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.lengthOf(reloaded.notes!, 5000)
  })

  test('PATCH notes refuse 5001 caractères', async ({ client, assert }) => {
    const { user, boat, engine } = await seed()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/notes`)
      .loginAs(user)
      .form({ notes: 'a'.repeat(5001) })
      .redirects(0)

    assertFieldErrors(assert, response, ['notes'])

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.isNull(reloaded.notes)
  })
})

test.group('Engine partial updates — bornage', (group) => {
  group.each.setup(() => truncateDb())

  test('un moteur rattaché à un autre bateau de la même organisation est refusé', async ({
    client,
    assert,
  }) => {
    const { user, engine } = await seed()
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .patch(`/boats/${otherBoat.id}/engines/${engine.id}/status`)
      .loginAs(user)
      .form({ status: 'retired' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${otherBoat.id}`)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'operational')
  })

  test("un bateau d'une autre organisation redirige vers /boats sans rien écrire", async ({
    client,
    assert,
  }) => {
    const { boat, engine } = await seed()
    const attacker = await createAdminUser()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/status`)
      .loginAs(attacker)
      .form({ status: 'retired' })
      .redirects(0)

    // Le scoping est un `where('organizationId', …)` dans
    // `BoatHullService.getForUserOrFail`, pas un bouncer : d'où une redirection
    // vers la liste, et jamais un 403 ni un 404.
    response.assertStatus(302)
    response.assertHeader('location', '/boats')

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'operational')
  })

  test('un member de la même organisation peut modifier — boats.edit lui est accordé', async ({
    client,
    assert,
  }) => {
    const { user, boat, engine } = await seed()
    const member = await createMemberUser(user.organizationId!)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/status`)
      .loginAs(member)
      .form({ status: 'in_maintenance' })
      .redirects(0)

    response.assertStatus(302)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'in_maintenance')
  })

  test("un mechanic est refusé — ses capabilities s'arrêtent à la maintenance", async ({
    client,
    assert,
  }) => {
    const { user, boat, engine } = await seed()
    const mechanic = await createMechanicUser(user.organizationId!)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/notes`)
      .loginAs(mechanic)
      .form({ notes: 'note du mécanicien' })
      .redirects(0)

    response.assertStatus(302)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.isNull(reloaded.notes)
  })

  test('les deux routes exigent une session', async ({ client, assert }) => {
    const { boat, engine } = await seed()

    for (const route of ['status', 'notes']) {
      const response = await client
        .patch(`/boats/${boat.id}/engines/${engine.id}/${route}`)
        .form({ status: 'retired', notes: 'anonyme' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/login')
    }

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.status, 'operational')
    assert.isNull(reloaded.notes)
  })
})
