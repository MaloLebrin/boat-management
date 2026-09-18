import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'

/**
 * Les cinq seaux du planning (#693).
 *
 * `/planning` est l'écran de pilotage quotidien, et il ventile les tâches en
 * `overdue / soon / planned / undated / done`. Avant ce fichier, deux seaux
 * seulement étaient touchés par un test, et **aucun test n'employait deux
 * organisations** — alors que l'isolation de cet écran ne tient qu'à un
 * `where('organizationId', …)`, sans bouncer.
 *
 * ⚠️ Deux seuils cohabitent, et ce sont eux qu'on fige ici :
 *
 * - tâche **datée** : `soon` jusqu'à **J+30 inclus**, `planned` au-delà ;
 * - tâche **horaire** : `soon` tant qu'il reste **1 à 50 heures** ; à 0 heure
 *   restante ou moins, `overdue`.
 *
 * Les cas portent sur les **bornes**, pas sur les milieux : un test à J+3
 * resterait vert si le seuil passait de 30 à 60 jours.
 */

function isoDate(offsetDays: number): string {
  return DateTime.now().plus({ days: offsetDays }).toISODate()!
}

interface PlanningProps {
  overdueTasks: { id: number }[]
  soonTasks: { id: number }[]
  plannedTasks: { id: number }[]
  undatedTasks: { id: number }[]
  doneTasks: { id: number }[]
  doneTasksTotal: number
}

async function planningOf(client: ApiClient, user: User): Promise<PlanningProps> {
  const response = await client.get('/planning').loginAs(user).withInertia()
  response.assertStatus(200)
  return response.inertiaProps as PlanningProps
}

/** Le seau dans lequel une tâche apparaît, ou `null` si elle est absente partout. */
function bucketOf(props: PlanningProps, taskId: number): string | null {
  const buckets: Array<[string, { id: number }[]]> = [
    ['overdue', props.overdueTasks],
    ['soon', props.soonTasks],
    ['planned', props.plannedTasks],
    ['undated', props.undatedTasks],
    ['done', props.doneTasks],
  ]

  const found = buckets.filter(([, tasks]) => tasks.some((t) => t.id === taskId))
  if (found.length === 0) return null
  // Un même id dans deux seaux serait un bug de ventilation : on le rend visible
  // plutôt que de retenir le premier.
  if (found.length > 1) return found.map(([name]) => name).join('+')
  return found[0][0]
}

test.group('Planning — seaux des tâches datées', (group) => {
  group.each.setup(() => truncateDb())

  const DATED_CASES: Array<{ label: string; offsetDays: number; expected: string }> = [
    { label: 'hier', offsetDays: -1, expected: 'overdue' },
    { label: "aujourd'hui", offsetDays: 0, expected: 'soon' },
    { label: 'dans 3 jours', offsetDays: 3, expected: 'soon' },
    // Les deux cas qui comptent : la borne, de part et d'autre.
    { label: 'dans 30 jours (borne incluse)', offsetDays: 30, expected: 'soon' },
    { label: 'dans 31 jours (juste au-delà)', offsetDays: 31, expected: 'planned' },
    { label: 'dans 60 jours', offsetDays: 60, expected: 'planned' },
  ]

  for (const dated of DATED_CASES) {
    test(`une échéance ${dated.label} tombe dans « ${dated.expected} »`, async ({
      client,
      assert,
    }) => {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const task = await BoatMaintenanceTask.create({
        boatId: boat.id,
        subject: 'hull',
        title: `Échéance ${dated.label}`,
        status: 'open',
        dueAt: DateTime.fromISO(isoDate(dated.offsetDays)),
        dueEngineHours: null,
      })

      const props = await planningOf(client, user)

      assert.equal(bucketOf(props, task.id), dated.expected)
    })
  }
})

test.group('Planning — seaux des tâches horaires', (group) => {
  group.each.setup(() => truncateDb())

  const HOURS_CASES: Array<{ label: string; remaining: number; expected: string }> = [
    { label: 'dépassée de 10 heures', remaining: -10, expected: 'overdue' },
    // `currentEngineHours >= dueEngineHours` : à égalité, c'est déjà en retard.
    { label: 'atteinte à l’heure près', remaining: 0, expected: 'overdue' },
    { label: 'à 1 heure près', remaining: 1, expected: 'soon' },
    { label: 'à 50 heures (borne incluse)', remaining: 50, expected: 'soon' },
    { label: 'à 51 heures (juste au-delà)', remaining: 51, expected: 'planned' },
  ]

  for (const hours of HOURS_CASES) {
    test(`une échéance ${hours.label} tombe dans « ${hours.expected} »`, async ({
      client,
      assert,
    }) => {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

      const task = await BoatMaintenanceTask.create({
        boatId: boat.id,
        boatEngineId: engine.id,
        subject: 'engine',
        title: `Révision ${hours.label}`,
        status: 'open',
        dueAt: null,
        dueEngineHours: 100 + hours.remaining,
      })

      const props = await planningOf(client, user)

      assert.equal(bucketOf(props, task.id), hours.expected)
    })
  }

  test('une tâche horaire sans moteur rattaché atterrit dans « planned » malgré son retard', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: null,
      subject: 'engine',
      title: 'Révision sans moteur rattaché',
      status: 'open',
      dueAt: null,
      dueEngineHours: 10,
    })

    const props = await planningOf(client, user)

    // ⚠️ Comportement constaté, pas souhaité. Sans `boatEngineId`,
    // `currentEngineHours` vaut `null` et les deux prédicats de scoring
    // renvoient `false` : la tâche échoue silencieusement dans « planifié ».
    // Elle est donc invisible du pilotage quotidien, quel que soit son retard.
    // Figé tel quel pour que ce soit vu avant d'être changé.
    assert.equal(bucketOf(props, task.id), 'planned')
  })
})

test.group('Planning — arbitrages entre les deux axes', (group) => {
  group.each.setup(() => truncateDb())

  test('une tâche portant les deux échéances est classée sur les heures, pas sur la date', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      // Date largement dépassée…
      dueAt: DateTime.fromISO(isoDate(-90)),
      // …mais 400 heures avant l'échéance horaire.
      dueEngineHours: 500,
      title: 'Échéance mixte',
      status: 'open',
    })

    const props = await planningOf(client, user)

    // `kind` est décidé par `dueEngineHours !== null` : dès qu'une échéance
    // horaire existe, la date n'est plus regardée du tout.
    assert.equal(bucketOf(props, task.id), 'planned')
  })

  test('« undated » exige les deux échéances nulles', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

    const undated = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Sans aucune échéance',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
    })

    const hoursOnly = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Sans date mais avec des heures',
      status: 'open',
      dueAt: null,
      dueEngineHours: 120,
    })

    const props = await planningOf(client, user)

    assert.equal(bucketOf(props, undated.id), 'undated')
    assert.equal(bucketOf(props, hoursOnly.id), 'soon')
  })
})

test.group('Planning — tâches terminées', (group) => {
  group.each.setup(() => truncateDb())

  test('une tâche terminée quitte les quatre autres seaux', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const done = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Terminée mais en retard sur le papier',
      // Une échéance passée : si le filtrage se faisait en mémoire plutôt qu'en
      // SQL, elle apparaîtrait aussi dans `overdue`.
      status: 'done',
      dueAt: DateTime.fromISO(isoDate(-10)),
      doneAt: DateTime.now(),
      dueEngineHours: null,
    })

    const props = await planningOf(client, user)

    assert.equal(bucketOf(props, done.id), 'done')
  })

  test('les tâches terminées sont plafonnées à 20, mais leur total est exact', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    for (let index = 0; index < 21; index++) {
      await BoatMaintenanceTask.create({
        boatId: boat.id,
        subject: 'hull',
        title: `Terminée ${index}`,
        status: 'done',
        dueAt: null,
        doneAt: DateTime.now(),
        dueEngineHours: null,
      })
    }

    const props = await planningOf(client, user)

    // Le plafond est un choix d'affichage ; `doneTasksTotal` est là pour que
    // l'écran ne mente pas sur le volume réel.
    assert.lengthOf(props.doneTasks, 20)
    assert.equal(props.doneTasksTotal, 21)
  })
})

test.group('Planning — isolation entre organisations', (group) => {
  group.each.setup(() => truncateDb())

  test("les tâches d'une autre organisation n'apparaissent dans aucun seau", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const stranger = await createAdminUser()
    const strangerBoat = await BoatFactory.merge({
      organizationId: stranger.organizationId!,
    }).create()
    const strangerEngine = await BoatEngineFactory.merge({
      boatId: strangerBoat.id,
      hours: 100,
    }).create()

    // Une tâche étrangère par seau : un filtre relâché se verrait forcément.
    const foreign = await Promise.all([
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        subject: 'hull',
        title: 'Étrangère en retard',
        status: 'open',
        dueAt: DateTime.fromISO(isoDate(-5)),
        dueEngineHours: null,
      }),
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        subject: 'hull',
        title: 'Étrangère bientôt due',
        status: 'open',
        dueAt: DateTime.fromISO(isoDate(5)),
        dueEngineHours: null,
      }),
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        subject: 'hull',
        title: 'Étrangère planifiée',
        status: 'open',
        dueAt: DateTime.fromISO(isoDate(60)),
        dueEngineHours: null,
      }),
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        subject: 'hull',
        title: 'Étrangère sans échéance',
        status: 'open',
        dueAt: null,
        dueEngineHours: null,
      }),
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        boatEngineId: strangerEngine.id,
        subject: 'engine',
        title: 'Étrangère horaire',
        status: 'open',
        dueAt: null,
        dueEngineHours: 110,
      }),
      BoatMaintenanceTask.create({
        boatId: strangerBoat.id,
        subject: 'hull',
        title: 'Étrangère terminée',
        status: 'done',
        dueAt: null,
        doneAt: DateTime.now(),
        dueEngineHours: null,
      }),
    ])

    const mine = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'La mienne',
      status: 'open',
      dueAt: DateTime.fromISO(isoDate(5)),
      dueEngineHours: null,
    })

    const props = await planningOf(client, user)

    // Témoin : le planning n'est pas vide pour une mauvaise raison.
    assert.equal(bucketOf(props, mine.id), 'soon')

    for (const task of foreign) {
      assert.isNull(
        bucketOf(props, task.id),
        `la tâche « ${task.title} » d'une autre organisation apparaît dans le planning`
      )
    }
    assert.equal(props.doneTasksTotal, 0)
  })
})
