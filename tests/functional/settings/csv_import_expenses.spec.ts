import { test } from '@japa/runner'
import ExcelJS from 'exceljs'
import { truncateDb } from '#tests/utils/db'
import BoatBudgetEntry from '#models/boat_budget_entry'
import PendingImport from '#models/pending_import'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'
import { UserFactory } from '#database/factories/user_factory'
import type { ExpenseImportRow } from '#shared/types/csv'
import {
  createAdminUser,
  createEnterpriseAdminUser,
  createMemberUser,
} from '#tests/functional/helpers'
import { DateTime } from 'luxon'

/**
 * Import de dépenses (`boat_budget_entries`) depuis `/settings/import`, en CSV
 * ou en classeur Excel. Même garde que l'import de maintenance (plan
 * Entreprise + `import.run`), mêmes routes ; ce qui change : les en-têtes
 * tolérantes (alias FR/EN), les formats de date et de montant, et le statut
 * `duplicate` qui écarte une ligne déjà présente sur le bateau.
 */

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** En-têtes françaises accentuées : c'est le cas nominal d'un tableur perso. */
const FR_CSV = `Date;Libellé;Montant;Catégorie;Description
15/01/2026;Antifouling;350,00;entretien;Carénage annuel
2026-02-03;Plein gasoil;120,50 €;carburant;
`

const INVALID_ROW_CSV = `date;label;amount
2026-01-15;;abc
`

async function buildXlsx(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Dépenses')
  for (const row of rows) sheet.addRow(row)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

test.group('Import de dépenses — prévisualisation', (group) => {
  group.each.setup(() => truncateDb())

  test('un CSV aux en-têtes françaises prépare un import de type expenses', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: { type: 'expenses', totalRows: 2, validRows: 2, invalidRows: 0, duplicateRows: 0 },
    })

    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.equal(pending.type, 'expenses')
    assert.deepEqual(pending.rows as ExpenseImportRow[], [
      {
        date: '2026-01-15',
        label: 'Antifouling',
        amount: 350,
        category: 'maintenance',
        description: 'Carénage annuel',
      },
      {
        date: '2026-02-03',
        label: 'Plein gasoil',
        amount: 120.5,
        category: 'fuel',
        description: null,
      },
    ])
  })

  test('un classeur Excel donne le même résultat, dates et nombres compris', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const xlsx = await buildXlsx([
      ['Date', 'Libellé', 'Montant', 'Catégorie'],
      [new Date(Date.UTC(2026, 0, 15)), 'Antifouling', 350, 'maintenance'],
      [new Date(Date.UTC(2026, 1, 3)), 'Plein gasoil', 120.5, 'carburant'],
    ])

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', xlsx, { filename: 'depenses.xlsx', contentType: XLSX_CONTENT_TYPE })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: { type: 'expenses', validRows: 2, rows: [{ raw: { date: '2026-01-15' } }] },
    })

    const pending = await PendingImport.findByOrFail('userId', user.id)
    const rows = pending.rows as ExpenseImportRow[]
    assert.lengthOf(rows, 2)
    assert.deepInclude(rows[1], { date: '2026-02-03', amount: 120.5, category: 'fuel' })
  })

  test('un .xlsx illisible est refusé avec un message, sans import en attente', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    // Un classeur valide dont la fin (répertoire central du zip) est écrasée :
    // la détection de type par en-tête voit toujours un .xlsx, exceljs ne peut
    // plus l'ouvrir. Un simple texte renommé serait, lui, refusé plus tôt par
    // le validateur d'extension.
    const corrupted = await buildXlsx([
      ['date', 'label', 'amount'],
      ['2026-01-15', 'Antifouling', 350],
    ])
    corrupted.fill(0, corrupted.length - 200)

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', corrupted, { filename: 'depenses.xlsx', contentType: XLSX_CONTENT_TYPE })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
    response.assertFlashMessage(
      'error',
      'The file could not be read. Check that it is a valid CSV or .xlsx workbook.'
    )
    assert.isNull(await PendingImport.findBy('userId', user.id))
  })

  test('une dépense déjà présente sur le bateau est signalée et écartée', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatBudgetEntryFactory.merge({
      boatId: boat.id,
      date: DateTime.fromISO('2026-01-15'),
      label: 'Antifouling',
      amount: '350.00',
    }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: {
        totalRows: 2,
        validRows: 1,
        invalidRows: 0,
        duplicateRows: 1,
        rows: [
          { line: 2, status: 'duplicate', errors: [] },
          { line: 3, status: 'valid' },
        ],
      },
    })

    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.lengthOf(pending.rows, 1)
    assert.equal((pending.rows[0] as ExpenseImportRow).label, 'Plein gasoil')
  })

  test('la seconde occurrence d’une même ligne dans le fichier est un doublon', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const csv = `date;label;amount
2026-01-15;Antifouling;350
2026-01-15;antifouling;350,00
`

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(csv), { filename: 'depenses.csv', contentType: 'text/csv' })

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      preview: {
        validRows: 1,
        duplicateRows: 1,
        rows: [{ status: 'valid' }, { status: 'duplicate' }],
      },
    })
    const pending = await PendingImport.findByOrFail('userId', user.id)
    assert.lengthOf(pending.rows, 1)
  })

  test('les erreurs de ligne sont traduites (en puis fr)', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const en = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(INVALID_ROW_CSV), { filename: 'd.csv', contentType: 'text/csv' })

    en.assertStatus(200)
    en.assertInertiaPropsContains({
      preview: {
        validRows: 0,
        invalidRows: 1,
        rows: [
          {
            status: 'invalid',
            errors: [
              { column: 'label', message: 'Label is required' },
              { column: 'amount', message: 'Invalid amount (expected a number)' },
            ],
          },
        ],
      },
    })

    const fr = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .withInertia()
      .header('Accept-Language', 'fr')
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(INVALID_ROW_CSV), { filename: 'd.csv', contentType: 'text/csv' })

    fr.assertStatus(200)
    fr.assertInertiaPropsContains({
      preview: { rows: [{ errors: [{ column: 'label', message: 'Le libellé est obligatoire' }] }] },
    })
  })

  test('des en-têtes requises manquantes renvoient le message générique', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from('date;description\n2026-01-15;x\n'), {
        filename: 'd.csv',
        contentType: 'text/csv',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Missing headers in the file: label, amount.')
  })
})

test.group('Import de dépenses — garde de plan et de rôle', (group) => {
  group.each.setup(() => truncateDb())

  test('refusé en plan pro, avec l’upsell', async ({ client, assert }) => {
    const user = await createAdminUser('pro')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'CSV import is reserved to the Enterprise plan. Upgrade to Enterprise to bring in your maintenance history.'
    )
    assert.isNull(await PendingImport.findBy('userId', user.id))
  })

  test('refusé à un membre non admin d’une organisation Entreprise', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(member)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })
      .redirects(0)

    // Le refus de Bouncer est rendu en redirection, comme pour la maintenance.
    response.assertStatus(302)
    assert.isNull(await PendingImport.findBy('userId', member.id))
  })
})

test.group('Import de dépenses — confirmation', (group) => {
  group.each.setup(() => truncateDb())

  test('la confirmation crée les dépenses, montant en chaîne et catégorie résolue', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })
      .redirects(0)
    const pending = await PendingImport.findByOrFail('userId', user.id)

    const confirm = await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .redirects(0)

    confirm.assertStatus(302)
    confirm.assertFlashMessage('success', '2 rows imported successfully.')

    const entries = await BoatBudgetEntry.query().where('boatId', boat.id).orderBy('date', 'asc')
    assert.lengthOf(entries, 2)
    assert.equal(entries[0].label, 'Antifouling')
    assert.equal(Number(entries[0].amount), 350)
    assert.equal(entries[0].category, 'maintenance')
    assert.equal(entries[0].description, 'Carénage annuel')
    assert.equal(entries[0].date.toISODate(), '2026-01-15')
    assert.equal(entries[1].label, 'Plein gasoil')
    assert.equal(Number(entries[1].amount), 120.5)
    assert.equal(entries[1].category, 'fuel')
    assert.isNull(entries[1].description)

    assert.isNull(await PendingImport.findBy('userId', user.id))
  })

  test('une ligne en doublon n’est jamais réécrite à la confirmation', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatBudgetEntryFactory.merge({
      boatId: boat.id,
      date: DateTime.fromISO('2026-01-15'),
      label: 'Antifouling',
      amount: '350.00',
    }).create()

    await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .file('file', Buffer.from(FR_CSV), { filename: 'depenses.csv', contentType: 'text/csv' })
      .redirects(0)
    const pending = await PendingImport.findByOrFail('userId', user.id)

    await client
      .post('/settings/import/confirm')
      .loginAs(user)
      .withSession({ pendingImportId: pending.id })
      .fields({ type: 'expenses', boatId: String(boat.id) })
      .redirects(0)

    const entries = await BoatBudgetEntry.query().where('boatId', boat.id)
    assert.lengthOf(entries, 2)
    assert.lengthOf(
      entries.filter((e) => e.label === 'Antifouling'),
      1
    )
  })
})

test.group('Import de dépenses — présélection par query-string', (group) => {
  group.each.setup(() => truncateDb())

  test('?type=expenses&boatId=N présélectionne le formulaire', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get('/settings/import')
      .qs({ type: 'expenses', boatId: boat.id })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({ initialType: 'expenses', initialBoatId: boat.id })
  })

  test('un type inconnu ou un bateau d’une autre organisation sont ignorés', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const other = await UserFactory.with('organization').create()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()

    const response = await client
      .get('/settings/import')
      .qs({ type: 'invoices', boatId: foreignBoat.id })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({ initialType: null, initialBoatId: null })
  })
})
