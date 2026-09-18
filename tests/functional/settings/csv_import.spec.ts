import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'

// ⚠️ Séparateur **point-virgule** et sujets tirés de `VALID_SUBJECTS`.
// Ce littéral était écrit en virgules, avec les libellés « Moteur » et
// « Voilure » : tout tenait dans une seule colonne, `missingHeaders` n'était
// jamais vide, et les deux tests ci-dessous observaient la redirection d'erreur
// d'en-têtes — la même que celle qu'ils attendaient. Ils passaient donc sans
// rien exercer du gating de plan qu'ils prétendent couvrir (#693).
const VALID_CSV = `date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;150
2024-02-20;Révision voile;sail;OK;;Grand-voile;0
`

const INVALID_ROW_CSV = `date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;;engine;RAS;Moteur bâbord;;150
`

test.group('CSV import preview (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // ⚠️ `/settings/import` redirige vers lui-même **dans les deux cas** : succès
  // comme erreur d'en-têtes. Asserter la seule `location` ne distingue donc
  // rien — c'est ce que faisaient ces deux tests. Ce qui sépare les deux, c'est
  // la présence de `pendingImport` en session (#693).
  for (const plan of ['starter', 'pro'] as const) {
    test(`POST /settings/import/preview prépare l'import en plan ${plan}`, async ({
      client,
      assert,
    }) => {
      const user = await UserFactory.with('organization', 1, (org) => org.merge({ plan })).create()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post('/settings/import/preview')
        .loginAs(user)
        .fields({ type: 'maintenance', boatId: String(boat.id) })
        .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/settings/import')

      // Le constat que ces deux cas établissent : l'import **n'est pas gardé
      // par le plan**. Le `starter` prépare son import comme le `pro`.
      const pending = response.session('pendingImport') as { validRows: unknown[] } | undefined
      assert.isDefined(pending)
      assert.lengthOf(pending!.validRows, 2)
    })
  }

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
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

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
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
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
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
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
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
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
