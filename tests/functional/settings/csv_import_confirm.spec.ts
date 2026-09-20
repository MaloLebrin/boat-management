import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import PendingImport from '#models/pending_import'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
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

/** Un CSV de maintenance valide de `count` lignes. */
function buildValidCsv(count: number): string {
  const rows = Array.from(
    { length: count },
    (_, i) => `2026-01-15;Vidange ${i};engine;RAS;Moteur bâbord;;150`
  )
  return `${HEADERS}\n${rows.join('\n')}\n`
}

/**
 * Prévisualisation réelle, pour disposer d'un import en attente importable.
 *
 * Depuis #774, l'attente vit en base (`pending_imports`) et non en session :
 * avec `SESSION_DRIVER=cookie`, quelques centaines de lignes dépassaient les
 * ~4 Ko d'un cookie. La session ne porte plus que l'identifiant.
 */
async function previewAs(client: ApiClient, user: User, boatId: number): Promise<PendingImport> {
  await client
    .post('/settings/import/preview')
    .loginAs(user)
    .fields({ type: 'maintenance', boatId: String(boatId) })
    .file('file', Buffer.from(TWO_VALID_ROWS), {
      filename: 'import.csv',
      contentType: 'text/csv',
    })
    .redirects(0)

  return PendingImport.findByOrFail('userId', user.id)
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
    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.lengthOf(pending.rows, 2)

    const confirm = await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
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

    await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(TWO_VALID_ROWS), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    const pending = await PendingImport.findByOrFail('userId', user.id)

    await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
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

    await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(ONE_INVALID_ROW), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.lengthOf(pending.rows, 2)

    await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
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
    assert.lengthOf(await PendingImport.all(), 0)
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
  })

  /**
   * Plusieurs centaines de lignes (#774).
   *
   * C'est le cas que l'ancienne implémentation ne pouvait pas servir : les
   * lignes validées étaient stockées telles quelles en session, et
   * `SESSION_DRIVER=cookie` (la valeur de `.env.example`, donc de la prod) ne
   * porte que ~4 Ko. Au-delà, l'aperçu s'affichait correctement puis le
   * `confirm` ne trouvait plus rien — un « votre prévisualisation a expiré »
   * pour un fichier parfaitement valide.
   *
   * Le test tourne ici avec `SESSION_DRIVER=memory` (`.env.test`), qui n'a pas
   * cette borne : c'est la taille du payload de session qui fait foi, et c'est
   * elle qui est assertée. Avec les lignes en session elle dépasse les 100 Ko.
   */
  test('un import de plusieurs centaines de lignes se confirme intégralement', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const rowCount = 600

    const preview = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(buildValidCsv(rowCount)), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    preview.assertStatus(302)

    // Ce que le store de session doit porter d'une requête à l'autre : un
    // identifiant et un booléen. Sans plafond ici, le driver cookie casse.
    const sessionPayload = JSON.stringify(preview.session())
    assert.isBelow(Buffer.byteLength(sessionPayload), 1024, sessionPayload.slice(0, 200))

    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.lengthOf(pending.rows, rowCount)

    const confirm = await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    confirm.assertStatus(302)
    // Les lots d'insertion (`CSV_IMPORT_INSERT_CHUNK`) restent dans la même
    // transaction : les 600 lignes sont là, ou aucune.
    assert.lengthOf(await BoatMaintenanceEvent.query().where('boatId', boat.id), rowCount)
    // L'attente est purgée : pas de ligne orpheline à balayer plus tard.
    assert.lengthOf(await PendingImport.all(), 0)
  })

  /**
   * L'identifiant en session ne suffit pas (#774) : la propriété se prouve en
   * base, par le `where('userId')` du contrôleur.
   *
   * Le cas se joue **entre deux admins de la même organisation** — sinon la
   * vérification du bateau (`getForUserOrFail`) tranche avant et le
   * `where('userId')` ne décide de rien. Ici les deux voient le bateau : sans
   * ce scope, le second consomme la prévisualisation du premier, qui la perd
   * sans avoir rien confirmé, et déclenche une écriture qu'il n'a pas préparée.
   */
  test("l'identifiant d'un import préparé par un autre ne confirme rien", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const organizationId = owner.organizationId!
    const boat = await BoatFactory.merge({ organizationId }).create()
    const pending = await previewAs(client, owner, boat.id)

    const colleague = await UserFactory.merge({ organizationId }).create()
    await OrganizationMembership.create({ userId: colleague.id, organizationId, role: 'admin' })

    const response = await client
      .post('/settings/import/confirm')
      .loginAs(colleague)
      .withSession({ pendingImportId: pending.id })
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await BoatMaintenanceEvent.all(), 0)
    // L'import du premier est intact : rien n'a été consommé en son nom.
    assert.isNotNull(await PendingImport.find(pending.id))
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
    assert.lengthOf(await PendingImport.all(), 0)
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
      assert.lengthOf(await PendingImport.all(), 0, `${role} a préparé un import`)

      // Le refus doit tenir même avec une prévisualisation **valide** déjà en
      // session : la confirmation ne s'appuie pas sur ce que la
      // prévisualisation a autorisé, elle vérifie pour son propre compte.
      // Celle-ci est préparée par l'admin, donc parfaitement importable — sans
      // garde, la confirmation écrirait ses deux lignes.
      const pending = await previewAs(client, admin, boat.id)
      assert.lengthOf(pending.rows, 2)

      const confirm = await client
        .post('/settings/import/confirm')
        .loginAs(user)
        .withSession({ pendingImportId: pending.id })
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
      .withSession({ pendingImportId: pending.id, hasPendingImport: true })
      .redirects(0)

    response.assertStatus(302)
    // La prévisualisation de l'admin survit : le mechanic n'a rien purgé.
    assert.isNotNull(await PendingImport.find(pending.id))
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
