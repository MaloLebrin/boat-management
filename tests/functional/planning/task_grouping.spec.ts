import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'

/**
 * Le regroupement de tâches et son gating de plan (#693).
 *
 * `groups` et `canGroupTasks` sont deux props de `planning/index` qu'aucun test
 * fonctionnel ne touchait : `TaskGroupingService` a ses tests unitaires, mais
 * rien ne vérifiait que l'écran les reçoit, ni que le plan `starter` en est
 * bien privé.
 *
 * ⚠️ Le piège de ce fichier, et la raison des échéances lointaines qu'on y
 * trouve : le service ne reçoit que **`plannedTasks`**, c'est-à-dire ce qui
 * n'est ni en retard ni bientôt dû. Deux tâches à J+3 et J+5, même bateau et
 * même sujet, sont dans `soon` et ne produisent donc **aucun groupe** — un test
 * écrit avec ces dates passerait au vert en ne prouvant rien. Il faut dépasser
 * la borne de 30 jours, d'où les J+60.
 */

interface GroupedProps {
  canGroupTasks: boolean
  groups: { subject: string; boatId: number; tasks: { id: number }[] }[]
  plannedTasks: { id: number }[]
  soonTasks: { id: number }[]
}

async function planningOf(client: ApiClient, user: User): Promise<GroupedProps> {
  const response = await client.get('/planning').loginAs(user).withInertia()
  response.assertStatus(200)
  return response.inertiaProps as GroupedProps
}

function dueIn(days: number): DateTime {
  return DateTime.fromISO(DateTime.now().plus({ days }).toISODate()!)
}

/** Deux tâches de même sujet sur le même bateau, à deux échéances données. */
async function seedPair(organizationId: number, firstOffset: number, secondOffset: number) {
  const boat = await BoatFactory.merge({ organizationId }).create()

  const first = await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'hull',
    title: 'Carénage — première passe',
    status: 'open',
    dueAt: dueIn(firstOffset),
    dueEngineHours: null,
  })
  const second = await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'hull',
    title: 'Carénage — seconde passe',
    status: 'open',
    dueAt: dueIn(secondOffset),
    dueEngineHours: null,
  })

  return { boat, first, second }
}

test.group('Planning — regroupement selon le plan', (group) => {
  group.each.setup(() => truncateDb())

  test('le plan pro reçoit canGroupTasks et un groupe peuplé', async ({ client, assert }) => {
    const user = await createAdminUser('pro')
    const { boat, first, second } = await seedPair(user.organizationId!, 60, 63)

    const props = await planningOf(client, user)

    assert.isTrue(props.canGroupTasks)
    assert.lengthOf(props.groups, 1)
    assert.equal(props.groups[0].subject, 'hull')
    assert.equal(props.groups[0].boatId, boat.id)
    assert.sameMembers(
      props.groups[0].tasks.map((t) => t.id),
      [first.id, second.id]
    )
  })

  test('le plan starter ne reçoit aucun groupe, alors que les mêmes tâches sont là', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('starter')
    const { first, second } = await seedPair(user.organizationId!, 60, 63)

    const props = await planningOf(client, user)

    assert.isFalse(props.canGroupTasks)
    assert.isEmpty(props.groups)

    // Le témoin qui fait la différence entre « le gating fonctionne » et « le
    // test ne regarde rien » : les deux tâches sont bien présentes et
    // regroupables — seul le plan les prive du groupe.
    assert.sameMembers(
      props.plannedTasks.map((t) => t.id),
      [first.id, second.id]
    )
  })

  test('le plan enterprise groupe comme le plan pro', async ({ client, assert }) => {
    const user = await createAdminUser('enterprise')
    await seedPair(user.organizationId!, 60, 63)

    const props = await planningOf(client, user)

    assert.isTrue(props.canGroupTasks)
    assert.lengthOf(props.groups, 1)
  })
})

test.group('Planning — ce qui fait, ou non, un groupe', (group) => {
  group.each.setup(() => truncateDb())

  test('deux tâches distantes de plus de 7 jours ne sont pas groupées', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('pro')
    const { first, second } = await seedPair(user.organizationId!, 60, 70)

    const props = await planningOf(client, user)

    assert.isTrue(props.canGroupTasks)
    assert.isEmpty(props.groups)
    assert.sameMembers(
      props.plannedTasks.map((t) => t.id),
      [first.id, second.id]
    )
  })

  test('deux sujets différents sur le même bateau ne sont pas groupés', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('pro')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage',
      status: 'open',
      dueAt: dueIn(60),
      dueEngineHours: null,
    })
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'sail',
      title: 'Révision de voile',
      status: 'open',
      dueAt: dueIn(62),
      dueEngineHours: null,
    })

    const props = await planningOf(client, user)

    assert.isEmpty(props.groups)
  })

  test('deux tâches proches mais « bientôt dues » ne sont pas groupées', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('pro')
    const { first, second } = await seedPair(user.organizationId!, 3, 5)

    const props = await planningOf(client, user)

    // C'est le piège décrit en tête de fichier, figé ici pour qu'il soit lisible
    // plutôt que subi : le regroupement ne s'applique qu'au seau « planifié ».
    // Deux entretiens à trois jours d'intervalle, que l'écran pourrait
    // légitimement proposer de grouper, ne le sont pas.
    assert.sameMembers(
      props.soonTasks.map((t) => t.id),
      [first.id, second.id]
    )
    assert.isEmpty(props.groups)
  })

  test('une tâche seule ne fait pas un groupe', async ({ client, assert }) => {
    const user = await createAdminUser('pro')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage isolé',
      status: 'open',
      dueAt: dueIn(60),
      dueEngineHours: null,
    })

    const props = await planningOf(client, user)

    assert.isEmpty(props.groups)
  })

  test('deux tâches de deux organisations ne se retrouvent jamais dans le même groupe', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('pro')
    const mine = await seedPair(user.organizationId!, 60, 63)

    const stranger = await createAdminUser('pro')
    await seedPair(stranger.organizationId!, 60, 63)

    const props = await planningOf(client, user)

    assert.lengthOf(props.groups, 1)
    assert.equal(props.groups[0].boatId, mine.boat.id)
    assert.lengthOf(props.groups[0].tasks, 2)
  })
})
