import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { truncateDb } from '#tests/utils/db'
import type Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import NavigationLog from '#models/navigation_log'
import NavigationLogEntry from '#models/navigation_log_entry'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'

/**
 * La sortie, jouée de bout en bout (#696).
 *
 * Les pièces sont bien couvertes — `navigation_logs.spec.ts` (23 cas),
 * `navigation_log_entries.spec.ts` (10), `navigation_log_crew.spec.ts` (6) —
 * mais chacune part d'une fabrique et repose le décor à sa main. Le **trajet**
 * n'était joué nulle part, et c'est lui qui porte les effets de bord : les
 * heures moteur du bateau, le rôle d'équipage figé dans le PDF, et le
 * basculement de ce qu'un rôle a le droit de faire une fois la sortie clôturée.
 *
 * Tout passe par HTTP, sans jamais poser l'état en base : c'est la seule façon
 * de voir ce que l'enchaînement réel produit.
 */

const DEPARTURE = '2026-07-14T08:30'
const ARRIVAL = '2026-07-14T17:45'

interface Voyage {
  admin: Awaited<ReturnType<typeof createAdminUser>>
  boat: Boat
  engine: BoatEngine
  logId: number
}

/** Ouvre une sortie **par la route**, moteur à 120 h au départ. */
async function departure(client: ApiClient) {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 120 }).create()

  const opened = await client
    .post(`/boats/${boat.id}/navigation-logs`)
    .loginAs(admin)
    .form({
      departedAt: DEPARTURE,
      tzOffsetMinutes: 0,
      departurePortName: 'Marseille',
      engineHoursStart: 120,
      boatEngineId: engine.id,
    })
    .redirects(0)

  opened.assertStatus(302)

  const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()
  return { admin, boat, engine, logId: log.id } satisfies Voyage
}

test.group('Sortie — le trajet complet, du départ à la clôture', (group) => {
  group.each.setup(() => truncateDb())

  test('ouverture, points, équipage et clôture s’enchaînent', async ({ client, assert }) => {
    const { admin, boat, engine, logId } = await departure(client)

    // Deux points en mer.
    for (const point of [
      { recordedAt: '2026-07-14T10:00', latitude: 43.29, longitude: 5.36 },
      { recordedAt: '2026-07-14T12:00', latitude: 43.21, longitude: 5.54 },
    ]) {
      const entry = await client
        .post(`/boats/${boat.id}/navigation-logs/${logId}/entries`)
        .loginAs(admin)
        .form({ ...point, tzOffsetMinutes: 0 })
        .redirects(0)
      entry.assertStatus(302)
    }

    // L'équipage, synchronisé pendant la sortie.
    const skipper = await CrewMemberFactory.merge({
      organizationId: admin.organizationId!,
      firstName: 'Alice',
      lastName: 'Dupont',
    }).create()
    const crew = await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/crew`)
      .loginAs(admin)
      // Clés à crochets : le tableau d'équipage voyage en `form`, pas en JSON.
      .form({ 'crew[0][crewMemberId]': skipper.id, 'crew[0][role]': 'skipper' })
      .redirects(0)
    crew.assertStatus(302)

    // La clôture, avec les heures moteur d'arrivée.
    const closed = await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/close`)
      .loginAs(admin)
      .form({
        arrivedAt: ARRIVAL,
        tzOffsetMinutes: 0,
        arrivalPortName: 'Cassis',
        distanceNm: 24,
        engineHoursEnd: 126,
        boatEngineId: engine.id,
      })
      .redirects(0)
    closed.assertStatus(302)

    const log = await NavigationLog.findOrFail(logId)
    assert.equal(log.status, 'completed')
    assert.equal(Number(log.distanceNm), 24)

    const entries = await NavigationLogEntry.query().where('navigationLogId', logId)
    assert.lengthOf(entries, 2, 'les points saisis en mer ont survécu à la clôture')

    await log.load('crew')
    assert.lengthOf(log.crew, 1)
    assert.equal(log.crew[0].firstName, 'Alice')

    // L'effet de bord que seul le trajet montre : le compteur du **moteur**
    // avance, pas seulement la ligne de journal.
    const afterTrip = await BoatEngine.findOrFail(engine.id)
    assert.equal(Number(afterTrip.hours), 126)
  })

  test("le rôle d'équipage part en PDF avec les équipiers synchronisés", async ({
    client,
    assert,
  }) => {
    // `crew_role_pdf.spec.ts` monte son décor en base ; ici l'équipage arrive
    // par la route de synchro, comme en mer.
    const { admin, boat, logId } = await departure(client)
    const skipper = await CrewMemberFactory.merge({
      organizationId: admin.organizationId!,
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/crew`)
      .loginAs(admin)
      // Clés à crochets : le tableau d'équipage voyage en `form`, pas en JSON.
      .form({ 'crew[0][crewMemberId]': skipper.id, 'crew[0][role]': 'skipper' })
      .redirects(0)

    const pdf = await client
      .get(`/boats/${boat.id}/navigation-logs/${logId}/crew-role.pdf`)
      .loginAs(admin)

    pdf.assertStatus(200)
    pdf.assertHeader('content-type', 'application/pdf')
    assert.include(pdf.header('content-disposition'), 'role-equipage-2026-07-14.pdf')
  })

  test('une sortie déjà clôturée ne se re-clôture pas', async ({ client, assert }) => {
    const { admin, boat, engine, logId } = await departure(client)

    const close = () =>
      client
        .patch(`/boats/${boat.id}/navigation-logs/${logId}/close`)
        .loginAs(admin)
        .form({
          arrivedAt: ARRIVAL,
          tzOffsetMinutes: 0,
          distanceNm: 24,
          engineHoursEnd: 126,
          boatEngineId: engine.id,
        })
        .redirects(0)

    await close()

    const second = await close()
    second.assertStatus(302)

    const log = await NavigationLog.findOrFail(logId)
    assert.equal(log.status, 'completed')
    assert.equal(Number(log.distanceNm), 24)

    // Et surtout : le compteur moteur n'a pas avancé deux fois. Une double
    // clôture qui repasserait dans le service ajouterait six heures fantômes.
    const afterTrip = await BoatEngine.findOrFail(engine.id)
    assert.equal(Number(afterTrip.hours), 126)
  })

  test('le bateau peut repartir une fois la sortie clôturée', async ({ client, assert }) => {
    const { admin, boat, engine, logId } = await departure(client)

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/close`)
      .loginAs(admin)
      .form({
        arrivedAt: ARRIVAL,
        tzOffsetMinutes: 0,
        engineHoursEnd: 126,
        boatEngineId: engine.id,
      })
      .redirects(0)

    const again = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(admin)
      .form({ departedAt: '2026-07-15T09:00', tzOffsetMinutes: 0, departurePortName: 'Cassis' })
      .redirects(0)

    again.assertStatus(302)
    assert.lengthOf(await NavigationLog.query().where('boatId', boat.id), 2)
  })
})

test.group('Sortie — ce que la clôture change pour les rôles', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * `canCorrectCompleted` est résolu par `NavigationLogPolicy.allows('delete')`,
   * donc par la capacité `navigation_logs.delete`, admin-only. La règle était
   * vérifiée sur un `POST store` isolé ; ici elle est jouée là où elle compte —
   * après une vraie clôture.
   */

  test('un member ajoute un point avant la clôture, plus après', async ({ client, assert }) => {
    const { admin, boat, engine, logId } = await departure(client)
    const member = await createMemberUser(admin.organizationId!)

    const beforeClose = await client
      .post(`/boats/${boat.id}/navigation-logs/${logId}/entries`)
      .loginAs(member)
      .form({
        recordedAt: '2026-07-14T10:00',
        tzOffsetMinutes: 0,
        latitude: 43.29,
        longitude: 5.36,
      })
      .redirects(0)
    beforeClose.assertStatus(302)
    assert.lengthOf(await NavigationLogEntry.query().where('navigationLogId', logId), 1)

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/close`)
      .loginAs(admin)
      .form({
        arrivedAt: ARRIVAL,
        tzOffsetMinutes: 0,
        engineHoursEnd: 126,
        boatEngineId: engine.id,
      })
      .redirects(0)

    const afterClose = await client
      .post(`/boats/${boat.id}/navigation-logs/${logId}/entries`)
      .loginAs(member)
      .form({
        recordedAt: '2026-07-14T18:00',
        tzOffsetMinutes: 0,
        latitude: 43.21,
        longitude: 5.54,
      })
      .redirects(0)

    afterClose.assertStatus(302)
    assert.lengthOf(
      await NavigationLogEntry.query().where('navigationLogId', logId),
      1,
      'un member a corrigé une sortie clôturée'
    )
  })

  test("l'admin, lui, corrige encore la sortie clôturée", async ({ client, assert }) => {
    // Le contre-exemple : sans lui, un refus global passerait pour la règle
    // métier qu'on croit mesurer.
    const { admin, boat, engine, logId } = await departure(client)

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${logId}/close`)
      .loginAs(admin)
      .form({
        arrivedAt: ARRIVAL,
        tzOffsetMinutes: 0,
        engineHoursEnd: 126,
        boatEngineId: engine.id,
      })
      .redirects(0)

    const correction = await client
      .post(`/boats/${boat.id}/navigation-logs/${logId}/entries`)
      .loginAs(admin)
      .form({
        recordedAt: '2026-07-14T18:00',
        tzOffsetMinutes: 0,
        latitude: 43.21,
        longitude: 5.54,
      })
      .redirects(0)

    correction.assertStatus(302)
    assert.lengthOf(await NavigationLogEntry.query().where('navigationLogId', logId), 1)
  })
})
