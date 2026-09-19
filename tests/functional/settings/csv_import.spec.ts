import { test } from '@japa/runner'
import PendingImport from '#models/pending_import'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'
import { CSV_IMPORT_MAX_FILE_SIZE_MB, CSV_IMPORT_MAX_ROWS } from '#shared/constants/csv_import'

// ⚠️ Séparateur **point-virgule** et sujets tirés de `VALID_SUBJECTS`.
// Ce littéral était écrit en virgules, avec les libellés « Moteur » et
// « Voilure » : tout tenait dans une seule colonne, `missingHeaders` n'était
// jamais vide, et les tests ci-dessous observaient la redirection d'erreur
// d'en-têtes — la même que celle qu'ils attendaient. Ils passaient donc sans
// rien exercer du gating de plan qu'ils prétendent couvrir (#693).
//
// ⚠️ Tous les utilisateurs de ce fichier sont des **admins Entreprise** : depuis
// #715, l'import exige le plan Entreprise et la capability `import.run`. Un
// utilisateur sans membership retomberait sur le rôle `member` par défaut et
// serait refusé avant d'atteindre ce que ces tests vérifient.
const VALID_CSV = `date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;150
2024-02-20;Révision voile;sail;OK;;Grand-voile;0
`

/** Message du refus de plan (#715), servi en anglais par défaut. */
const IMPORT_PLAN_FLASH =
  'CSV import is reserved to the Enterprise plan. Upgrade to Enterprise to bring in your maintenance history.'

const INVALID_ROW_CSV = `date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;;engine;RAS;Moteur bâbord;;150
`

/** Un CSV de maintenance valide de `count` lignes, pour éprouver le plafond. */
function buildMaintenanceCsv(count: number): string {
  const header = 'date;title;subject;notes;engine_caption;sail_caption;cost'
  const rows = Array.from(
    { length: count },
    (_, i) => `2026-01-15;Vidange ${i};engine;RAS;Moteur bâbord;;150`
  )
  return `${header}\n${rows.join('\n')}\n`
}

test.group('CSV import preview (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // ⚠️ `/settings/import` redirige vers lui-même **dans les deux cas** : succès
  // comme erreur d'en-têtes. Asserter la seule `location` ne distingue donc
  // rien — c'est ce que faisait la version précédente de ce test. Ce qui sépare
  // les deux, c'est la présence d'un import en attente (#693). Depuis #774 il
  // vit en base et non en session : un cookie ne tient pas quelques centaines
  // de lignes.
  test("POST /settings/import/preview prépare l'import en plan enterprise", async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')

    const pending = await PendingImport.findBy('userId', user.id)
    assert.isDefined(pending)
    assert.lengthOf(pending!.rows, 2)
    // La session ne porte plus que l'identifiant (#774).
    assert.equal(response.session('pendingImportId'), pending!.id)
  })

  // L'import est réservé au plan Entreprise (#715) : ces deux cas constataient
  // l'inverse — le `starter` préparait son import comme le `pro`. La
  // redirection change de destination (facturation, pas `/settings/import`) et
  // rien n'est préparé en session.
  for (const plan of ['starter', 'pro'] as const) {
    test(`POST /settings/import/preview est refusé en plan ${plan}`, async ({ client, assert }) => {
      const user = await createAdminUser(plan)
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post('/settings/import/preview')
        .loginAs(user)
        .fields({ type: 'maintenance', boatId: String(boat.id) })
        .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
        .redirects(0)

      response.assertStatus(302)
      response.assertFlashMessage('error', IMPORT_PLAN_FLASH)
      assert.lengthOf(await PendingImport.all(), 0)
    })
  }

  /**
   * Plafond de lignes (#774).
   *
   * Le parse ne bornait rien : `csvPreviewValidator` acceptait 5 Mo, soit
   * plusieurs dizaines de milliers de lignes, toutes parsées, validées, gardées
   * en mémoire puis insérées une par une dans une seule transaction. Ici le
   * refus tombe **avant** la validation des lignes, et le message nomme les
   * deux nombres — un « fichier invalide » ne dit pas quoi découper.
   */
  test(`POST /settings/import/preview refuse un fichier au-delà de ${CSV_IMPORT_MAX_ROWS} lignes`, async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const overflow = CSV_IMPORT_MAX_ROWS + 1
    const csv = buildMaintenanceCsv(overflow)

    // Le fichier reste sous le plafond de taille du validateur : c'est bien le
    // nombre de lignes qui le refuse, pas ses octets.
    assert.isBelow(Buffer.byteLength(csv), CSV_IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024)

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(csv), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
    response.assertFlashMessage(
      'error',
      `Your file has ${overflow} rows; the limit is ${CSV_IMPORT_MAX_ROWS}. Please split it.`
    )
    // Rien n'a été préparé : ni ligne en base, ni identifiant en session.
    assert.lengthOf(await PendingImport.all(), 0)
    assert.isUndefined(response.session('pendingImportId'))
  })

  test('POST /settings/import/preview redirige vers /login si non authentifié', async ({
    client,
  }) => {
    const response = await client
      .post('/settings/import/preview')
      .fields({ type: 'maintenance', boatId: '1' })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /settings/import/preview redirige avec erreur si le bateau est inconnu', async ({
    client,
  }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: '999999' })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
  })

  test('les erreurs de validation de ligne sont traduites en anglais par défaut', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(INVALID_ROW_CSV), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: { rows: [{ errors: [{ column: 'title', message: 'Title is required' }] }] },
    })

    const props = response.inertiaProps as {
      preview: { rows: { errors: { message: string }[] }[] }
    }
    assert.notEqual(props.preview.rows[0].errors[0].message, 'Le titre est obligatoire')
  })

  test('les erreurs de validation de ligne sont traduites en français avec Accept-Language: fr', async ({
    client,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .header('Accept-Language', 'fr')
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(INVALID_ROW_CSV), {
        filename: 'import.csv',
        contentType: 'text/csv',
      })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: {
        rows: [{ errors: [{ column: 'title', message: 'Le titre est obligatoire' }] }],
      },
    })
  })

  test('le message de sujet invalide est interpolé avec les valeurs acceptées', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const csv = `date;title;subject;notes;engine_caption;sail_caption;cost\n2024-01-15;Vidange;invalid_subject;RAS;;;150\n`

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(csv), { filename: 'import.csv', contentType: 'text/csv' })

    response.assertStatus(200)
    const props = response.inertiaProps as {
      preview: { rows: { errors: { column: string; message: string }[] }[] }
    }
    const subjectError = props.preview.rows[0].errors.find((e) => e.column === 'subject')

    assert.exists(subjectError)
    assert.include(subjectError!.message, 'engine')
  })
})
