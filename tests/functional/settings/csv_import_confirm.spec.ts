import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import { BoatFactory } from '#database/factories/boat_factory'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'
import {
  createBoatOwnerUser,
  createEnterpriseAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * L'import CSV de maintenance, de la prévisualisation à l'écriture (#693).
 *
 * `POST /settings/import/confirm` est le **seul** chemin qui écrit réellement
 * en base, et il n'avait aucun test : la couverture existante s'arrêtait à
 * `/preview`. Le job `ProcessBoatMaintenanceImport` ne fait rien — l'import est
 * intégralement synchrone, dans la requête.
 *
 * ⚠️ Depuis #715, l'import exige le plan Entreprise **et** la capability
 * `import.run` (admin seul) : tous les cas nominaux passent donc par
 * `createEnterpriseAdminUser()`.
 *
 * ⚠️ Le séparateur est le **point-virgule**, et les sujets doivent appartenir à
 * `VALID_SUBJECTS` (`engine`, `sail`, `hull`…), pas à leur libellé français.
 * C'est exactement ce qui rendait creux deux tests de `csv_import.spec.ts` :
 * écrit en virgules, leur « CSV valide » tenait dans une seule colonne, donc
 * échouait sur les en-têtes manquants — et la redirection observée était la
 * même que celle attendue.
 */

const HEADERS = 'date;title;subject;notes;engine_caption;sail_caption;cost'

const TWO_VALID_ROWS = `${HEADERS}
2026-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;150
2026-02-20;Révision de voile;sail;OK;;Grand-voile;
`

/** Une ligne sans titre (invalide) encadrée par deux lignes correctes. */
const ONE_INVALID_ROW = `${HEADERS}
2026-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;150
2026-01-16;;engine;Sans titre;Moteur tribord;;80
2026-01-17;Contrôle de coque;hull;RAS;;;
`

const MISSING_HEADERS = `date;title
2026-01-15;Vidange moteur
`

interface PendingImport {
  type: string
  boatId: number
  validRows: unknown[]
}

/** Prévisualisation réelle, pour disposer d'un `pendingImport` importable. */
async function previewAs(client: ApiClient, user: User, boatId: number): Promise<PendingImport> {
  const response = await client
    .post('/settings/import/preview')
    .loginAs(user)
    .fields({ type: 'maintenance', boatId: String(boatId) })
    .file('file', Buffer.from(TWO_VALID_ROWS), {
      filename: 'import.csv',
      contentType: 'text/csv',
    })
    .redirects(0)

  return response.session('pendingImport') as PendingImport
}

test.group('Import CSV — la confirmation écrit en base', (group) => {
  group.each.setup(() => truncateDb())

  test('deux lignes valides créent deux événements, et un coût crée sa pièce', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const preview = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(TWO_VALID_ROWS), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    preview.assertStatus(302)
    const pending = preview.session('pendingImport') as PendingImport
    assert.lengthOf(pending.validRows, 2)

    const confirm = await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImport: pending })
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    confirm.assertStatus(302)

    const events = await BoatMaintenanceEvent.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.lengthOf(events, 2)
    assert.equal(events[0].title, 'Vidange moteur')
    assert.equal(events[0].subject, 'engine')
    assert.equal(events[0].performedAt.toISODate(), '2026-01-15')
    assert.equal(events[0].engineCaption, 'Moteur bâbord')

    // Le coût devient une pièce ; la ligne sans coût n'en crée aucune.
    const parts = await BoatMaintenancePart.query().whereIn(
      'maintenanceEventId',
      events.map((e) => e.id)
    )
    assert.lengthOf(parts, 1)
    assert.equal(parts[0].maintenanceEventId, events[0].id)
    assert.equal(Number(parts[0].unitPrice), 150)
  })

  test("l'import ne rattache jamais un événement à un équipement réel", async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const preview = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(TWO_VALID_ROWS), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImport: preview.session('pendingImport') })
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    const events = await BoatMaintenanceEvent.query().where('boatId', boat.id)

    // `engine_caption` est du texte libre : les clés étrangères restent nulles.
    // Un import ne relie donc rien au moteur ou à la voile qu'il nomme —
    // comportement constaté, à connaître avant de s'appuyer dessus.
    for (const event of events) {
      assert.isNull(event.boatEngineId)
      assert.isNull(event.boatSailId)
    }
  })

  test('une ligne invalide est écartée, les lignes valides passent', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const preview = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(ONE_INVALID_ROW), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    const pending = preview.session('pendingImport') as PendingImport
    assert.lengthOf(pending.validRows, 2)

    await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImport: pending })
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    // Pas de tout-ou-rien : la ligne fautive est écartée en amont de la
    // transaction, les deux autres sont écrites. Un CSV à moitié mauvais
    // s'importe donc à moitié — figé tel quel.
    const events = await BoatMaintenanceEvent.query().where('boatId', boat.id)
    assert.lengthOf(events, 2)
  })

  test("des en-têtes manquants n'importent rien du tout", async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const preview = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(MISSING_HEADERS), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    preview.assertStatus(302)
    preview.assertHeader('location', '/settings/import')
    // La prévisualisation s'arrête avant de rien préparer.
    assert.isUndefined(preview.session('pendingImport'))
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
  })

  test('confirmer sans prévisualisation en cours ne crée rien', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
  })

  test("un bateau d'une autre organisation est refusé à la prévisualisation", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const attacker = await createEnterpriseAdminUser()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(attacker)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(TWO_VALID_ROWS), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
    assert.isUndefined(response.session('pendingImport'))
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
  })

  test('la confirmation exige une session', async ({ client, assert }) => {
    const response = await client
      .post('/settings/import/confirm')
      .fields({ type: 'maintenance', boatId: '1' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
  })
})

test.group('Import CSV — la garde de rôle (#715)', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Ces cas **constataient** un trou d'autorisation ; ils le referment.
   *
   * `/settings/import` — prévisualisation comme confirmation — n'était protégé
   * que par `middleware.auth()` : ni policy, ni capability. Un `mechanic`,
   * dont les droits s'arrêtent à la maintenance, et un `boat_owner`, qui n'a
   * **aucune** capability, écrivaient donc tous deux dans l'historique
   * d'entretien de n'importe quel bateau que leur organisation leur rend.
   *
   * La capability retenue est `import.run`, **admin seul** — alignée sur
   * `maintenance.delete` et non sur `maintenance.create` : un import en masse
   * écrit un historique que seul un admin peut ensuite corriger.
   *
   * L'organisation est au plan Entreprise dans tous les cas : c'est bien le
   * rôle qui refuse ici, pas le plan (piège des gardes en amont, cf.
   * `docs/dev/testing.md`).
   */
  for (const role of ['mechanic', 'member', 'boat_owner'] as const) {
    test(`un ${role} ne peut ni prévisualiser ni confirmer un import`, async ({
      client,
      assert,
    }) => {
      const admin = await createEnterpriseAdminUser()
      const orgId = admin.organizationId!
      const user =
        role === 'mechanic'
          ? await createMechanicUser(orgId)
          : role === 'member'
            ? await createMemberUser(orgId)
            : await createBoatOwnerUser(orgId)
      const boat = await BoatFactory.merge({ organizationId: orgId }).create()

      const preview = await client
        .post('/settings/import/preview')
        .loginAs(user)
        .fields({ type: 'maintenance', boatId: String(boat.id) })
        .file('file', Buffer.from(TWO_VALID_ROWS), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .redirects(0)

      preview.assertStatus(302)
      assert.isUndefined(preview.session('pendingImport'), `${role} a préparé un import`)

      // Le refus doit tenir même avec une prévisualisation **valide** déjà en
      // session : la confirmation ne s'appuie pas sur ce que la
      // prévisualisation a autorisé, elle vérifie pour son propre compte.
      // Celle-ci est préparée par l'admin, donc parfaitement importable — sans
      // garde, la confirmation écrirait ses deux lignes.
      const pending = await previewAs(client, admin, boat.id)
      assert.lengthOf(pending.validRows, 2)

      const confirm = await client
        .post('/settings/import/confirm')
        .loginAs(user)
        .withSession({ pendingImport: pending })
        .fields({ type: 'maintenance', boatId: String(boat.id) })
        .redirects(0)

      confirm.assertStatus(302)
      assert.lengthOf(await BoatMaintenanceEvent.query().where('boatId', boat.id), 0)
    })
  }

  test("un mechanic ne peut pas non plus annuler l'import en cours", async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const pending = await previewAs(client, admin, boat.id)

    const response = await client
      .post('/settings/import/cancel')
      .loginAs(mechanic)
      .withSession({ pendingImport: pending, hasPendingImport: true })
      .redirects(0)

    response.assertStatus(302)
    // La prévisualisation de l'admin survit : le mechanic n'a rien purgé.
    assert.isDefined(response.session('pendingImport'))
  })

  test("l'écran reste ouvert au mechanic pour ses exports, section d'import fermée", async ({
    client,
  }) => {
    const admin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/settings/import').loginAs(mechanic).withInertia()

    // `/settings/import` est l'écran Import **et** Export : les exports
    // s'arrêtent à `canExport` (Pro et Entreprise, tous rôles), seul l'import
    // exige `import.run`.
    response.assertStatus(200)
    response.assertInertiaPropsContains({ canImport: false })
  })

  test("un admin Entreprise garde l'écran et sa section d'import", async ({ client }) => {
    const admin = await createEnterpriseAdminUser()

    const response = await client.get('/settings/import').loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({ canImport: true })
  })
})
