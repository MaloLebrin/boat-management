import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatEngine from '#models/boat_engine'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

/**
 * La régénération d'une tâche récurrente, au niveau HTTP (#693).
 *
 * `markDone` était testé au niveau service, jamais à travers
 * `PUT /boats/:boatId/maintenance-tasks/:taskId/done` — le seul test HTTP de
 * cette route portait sur une tâche **non récurrente** et n'assertait que le
 * statut et la redirection. Ici les dates attendues sont écrites en
 * **littéral** plutôt que recalculées par la formule du code : à mutation
 * égale, l'échec nomme la date lue et la date voulue.
 *
 * Deux règles que ces tests figent, et qui ne sont écrites nulle part :
 *
 * - **en mois**, la prochaine échéance part de la **date de complétion**, pas
 *   de l'échéance précédente — une tâche faite en retard décale toute la série ;
 * - **en heures**, elle part du `doneEngineHours` **saisi dans le formulaire**,
 *   jamais du compteur réel du moteur.
 */

/** Tâche ouverte sur un bateau neuf, avec les surcharges demandées. */
async function seedTask(overrides: Partial<BoatMaintenanceTask> = {}) {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const task = await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'hull',
    title: 'Carénage',
    status: 'open',
    dueAt: null,
    dueEngineHours: null,
    ...overrides,
  })

  return { admin, boat, task }
}

async function tasksOf(boatId: number) {
  return BoatMaintenanceTask.query().where('boatId', boatId).orderBy('id', 'asc')
}

test.group('Récurrence en mois', (group) => {
  group.each.setup(() => truncateDb())

  test("la prochaine échéance part de la date de complétion, pas de l'échéance manquée", async ({
    client,
    assert,
  }) => {
    const { admin, boat, task } = await seedTask({
      // Échéance de janvier…
      dueAt: DateTime.fromISO('2026-01-01'),
      recurrenceIntervalMonths: 12,
    })

    const response = await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      // …mais faite en février.
      .form({ doneAt: '2026-02-10' })
      .redirects(0)

    response.assertStatus(302)

    const tasks = await tasksOf(boat.id)
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[0].status, 'done')
    assert.equal(tasks[0].doneAt!.toISODate(), '2026-02-10')

    // La date attendue est écrite en clair : 2027-02-10, et non « doneAt + 12
    // mois ». Vérifié par mutation — faire partir le calcul de `dueAt` donne
    // 2027-01-01 et fait tomber ce test.
    assert.equal(tasks[1].status, 'open')
    assert.equal(tasks[1].dueAt!.toISODate(), '2027-02-10')
    assert.equal(tasks[1].recurrenceIntervalMonths, 12)
  })

  test('la nouvelle tâche reprend le titre, les notes et le sujet', async ({ client, assert }) => {
    const { admin, boat, task } = await seedTask({
      title: 'Changement de zinc',
      notes: 'Fournisseur habituel',
      subject: 'hull',
      dueAt: DateTime.fromISO('2026-03-01'),
      recurrenceIntervalMonths: 6,
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-03-01' })
      .redirects(0)

    const tasks = await tasksOf(boat.id)
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[1].title, 'Changement de zinc')
    assert.equal(tasks[1].notes, 'Fournisseur habituel')
    assert.equal(tasks[1].subject, 'hull')
    assert.equal(tasks[1].dueAt!.toISODate(), '2026-09-01')
  })

  test('un intervalle de 0 mois est traité comme une absence de récurrence', async ({
    client,
    assert,
  }) => {
    const { admin, boat, task } = await seedTask({
      dueAt: DateTime.fromISO('2026-01-01'),
      recurrenceIntervalMonths: 0,
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-01-05' })
      .redirects(0)

    assert.lengthOf(await tasksOf(boat.id), 1)
  })
})

test.group('Récurrence en heures moteur', (group) => {
  group.each.setup(() => truncateDb())

  test('la prochaine échéance part des heures saisies, pas du compteur du moteur', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    // Le compteur réel est à 300…
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 300 }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Vidange',
      status: 'open',
      dueAt: null,
      dueEngineHours: 250,
      recurrenceIntervalEngineHours: 50,
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      // …mais le mécanicien déclare l'avoir faite à 260.
      .form({ doneEngineHours: '260' })
      .redirects(0)

    const tasks = await tasksOf(boat.id)
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[0].doneEngineHours, 260)

    // 260 + 50 = 310, et non 300 + 50 = 350 : la série repart de la déclaration,
    // pas du compteur. Le moteur tournant déjà à 300, la nouvelle échéance naît
    // à 10 heures de son terme — conséquence à connaître, figée ici.
    assert.equal(tasks[1].dueEngineHours, 310)
    assert.equal(tasks[1].lastDoneEngineHours, 260)
    assert.equal(tasks[1].boatEngineId, engine.id)
  })

  test('clore une tâche horaire sans déclarer les heures est refusé', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 300 }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Vidange',
      status: 'open',
      dueAt: null,
      dueEngineHours: 350,
    })

    const response = await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({})
      .redirects(0)

    response.assertStatus(302)

    await task.refresh()
    assert.equal(task.status, 'open')
    assert.lengthOf(await tasksOf(boat.id), 1)
  })

  test('une tâche mixte mois + heures ne produit qu’une seule occurrence suivante', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 300 }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Grande révision',
      status: 'open',
      dueAt: DateTime.fromISO('2026-01-01'),
      dueEngineHours: 350,
      recurrenceIntervalMonths: 12,
      recurrenceIntervalEngineHours: 100,
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-02-10', doneEngineHours: '340' })
      .redirects(0)

    const tasks = await tasksOf(boat.id)
    // Une seule ligne, portant les deux échéances — et non une par axe.
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[1].dueAt!.toISODate(), '2027-02-10')
    assert.equal(tasks[1].dueEngineHours, 440)
  })
})

test.group('Absence de récurrence, et clôtures répétées', (group) => {
  group.each.setup(() => truncateDb())

  test('une tâche non récurrente ne recrée rien', async ({ client, assert }) => {
    const { admin, boat, task } = await seedTask({ dueAt: DateTime.fromISO('2026-01-01') })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-01-05' })
      .redirects(0)

    // Jamais asserté nulle part avant : le seul test HTTP de `/done` vérifiait
    // le statut et la redirection, pas l'absence de ligne surnuméraire.
    const tasks = await tasksOf(boat.id)
    assert.lengthOf(tasks, 1)
    assert.equal(tasks[0].status, 'done')
  })

  test('clore deux fois la même tâche ne crée pas de doublon', async ({ client, assert }) => {
    const { admin, boat, task } = await seedTask({
      dueAt: DateTime.fromISO('2026-01-01'),
      recurrenceIntervalMonths: 12,
    })

    const route = `/boats/${boat.id}/maintenance-tasks/${task.id}/done`
    await client.put(route).loginAs(admin).form({ doneAt: '2026-01-05' }).redirects(0)
    const second = await client
      .put(route)
      .loginAs(admin)
      .form({ doneAt: '2026-01-06' })
      .redirects(0)

    second.assertStatus(302)

    const tasks = await tasksOf(boat.id)
    assert.lengthOf(tasks, 2)
    // La seconde clôture est un no-op : la date de complétion de la première
    // n'est pas réécrite, et aucune troisième occurrence n'apparaît.
    assert.equal(tasks[0].doneAt!.toISODate(), '2026-01-05')
  })
})

test.group('Croisement avec le compteur du moteur', (group) => {
  group.each.setup(() => truncateDb())

  test('incrémenter les heures fait basculer une tâche de « planned » à « overdue »', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Vidange',
      status: 'open',
      dueAt: null,
      // 100 heures restantes : au-delà du seuil de 50, donc « planifié ».
      dueEngineHours: 200,
    })

    const before = await client.get('/planning').loginAs(admin).withInertia()
    const beforeProps = before.inertiaProps as { plannedTasks: { id: number }[] }
    assert.includeMembers(
      beforeProps.plannedTasks.map((t) => t.id),
      [task.id]
    )

    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/hours`)
      .loginAs(admin)
      .form({ hoursIncrement: '150' })
      .redirects(0)

    const after = await client.get('/planning').loginAs(admin).withInertia()
    const afterProps = after.inertiaProps as { overdueTasks: { id: number }[] }
    assert.includeMembers(
      afterProps.overdueTasks.map((t) => t.id),
      [task.id]
    )

    // Le point à retenir : **rien n'a été écrit sur la tâche**. « En retard »
    // est un état dérivé, recalculé à chaque lecture du planning à partir du
    // compteur du moteur. Le `status` en base reste `open` indéfiniment.
    await task.refresh()
    assert.equal(task.status, 'open')
    assert.equal(task.dueEngineHours, 200)
    assert.isNull(task.doneAt)
  })

  test('un mécanicien clôt une tâche horaire mais ne peut pas incrémenter le compteur', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 300 }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      boatEngineId: engine.id,
      subject: 'engine',
      title: 'Vidange',
      status: 'open',
      dueAt: null,
      dueEngineHours: 350,
    })

    // `maintenance.edit` lui est accordé : la clôture passe.
    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(mechanic)
      .form({ doneEngineHours: '340' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.status, 'done')

    // Mais `boats.edit` ne l'est pas : il ne peut pas mettre le compteur à jour.
    // Asymétrie réelle — celui qui fait l'entretien déclare ses heures sans
    // pouvoir corriger le moteur.
    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/hours`)
      .loginAs(mechanic)
      .form({ hoursIncrement: '40' })
      .redirects(0)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 300)
  })
})
