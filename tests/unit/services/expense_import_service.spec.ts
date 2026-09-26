import { test } from '@japa/runner'
import { CSV_IMPORT_MAX_ROWS } from '#shared/constants/csv_import'
import {
  expenseDuplicateKey,
  parseExpenseTable,
  parseImportAmount,
  parseImportDate,
  resolveExpenseCategory,
  resolveExpenseHeaders,
  validateExpenseRow,
} from '#services/expense_import_service'

test.group('resolveExpenseHeaders (unit)', () => {
  test('reconnaît les en-têtes françaises accentuées et ignore les inconnues', ({ assert }) => {
    const { canonical, missingHeaders } = resolveExpenseHeaders([
      'Date',
      'Libellé',
      'Montant',
      'Catégorie',
      'Commentaire',
      'Fournisseur',
    ])

    assert.deepEqual(canonical, ['date', 'label', 'amount', 'category', 'description', null])
    assert.deepEqual(missingHeaders, [])
  })

  test('signale les colonnes requises manquantes', ({ assert }) => {
    const { missingHeaders } = resolveExpenseHeaders(['date', 'description'])
    assert.deepEqual(missingHeaders, ['label', 'amount'])
  })

  test('la première colonne correspondante gagne, la suivante est ignorée', ({ assert }) => {
    const { canonical } = resolveExpenseHeaders(['montant', 'prix', 'date', 'titre'])
    assert.deepEqual(canonical, ['amount', null, 'date', 'label'])
  })
})

test.group('parseImportDate (unit)', () => {
  test('accepte ISO, DD/MM/YYYY et DD-MM-YYYY', ({ assert }) => {
    assert.equal(parseImportDate('2024-02-15'), '2024-02-15')
    assert.equal(parseImportDate('15/02/2024'), '2024-02-15')
    assert.equal(parseImportDate('5/2/2024'), '2024-02-05')
    assert.equal(parseImportDate('15-02-2024'), '2024-02-15')
  })

  test('refuse un format inconnu ou une date inexistante', ({ assert }) => {
    assert.isNull(parseImportDate('31/02/2024'))
    assert.isNull(parseImportDate('2024/02/15'))
    assert.isNull(parseImportDate('hier'))
    assert.isNull(parseImportDate(''))
  })
})

test.group('parseImportAmount (unit)', () => {
  test('lit les écritures françaises et anglaises', ({ assert }) => {
    assert.equal(parseImportAmount('1 234,56'), 1234.56)
    assert.equal(parseImportAmount('1234.56'), 1234.56)
    assert.equal(parseImportAmount('1.234,56'), 1234.56)
    assert.equal(parseImportAmount('1,234.56'), 1234.56)
    assert.equal(parseImportAmount('1 234,56 €'), 1234.56)
    assert.equal(parseImportAmount('120,50'), 120.5)
    assert.equal(parseImportAmount('EUR 45'), 45)
    assert.equal(parseImportAmount('-45'), -45)
  })

  test('arrondit au centime et refuse le non numérique ou le hors bornes', ({ assert }) => {
    assert.equal(parseImportAmount('12.345'), 12.35)
    assert.isNull(parseImportAmount('abc'))
    assert.isNull(parseImportAmount(''))
    assert.equal(parseImportAmount('1,234,567'), 1234567)
    assert.isNull(parseImportAmount('12,3a'))
    assert.isNull(parseImportAmount('100000000'))
  })
})

test.group('resolveExpenseCategory (unit)', () => {
  test('slug, alias FR/EN, vide et inconnu', ({ assert }) => {
    assert.equal(resolveExpenseCategory('fuel'), 'fuel')
    assert.equal(resolveExpenseCategory('Carburant'), 'fuel')
    assert.equal(resolveExpenseCategory('Équipement'), 'equipment')
    assert.equal(resolveExpenseCategory('escale'), 'port')
    assert.equal(resolveExpenseCategory(''), 'other')
    assert.isNull(resolveExpenseCategory('loisirs'))
  })
})

test.group('validateExpenseRow (unit)', () => {
  test('une ligne complète devient une dépense normalisée', ({ assert }) => {
    const { errors, row } = validateExpenseRow({
      date: '15/02/2024',
      label: '  Plein gasoil ',
      amount: '120,50 €',
      category: 'carburant',
      description: '',
    })

    assert.lengthOf(errors, 0)
    assert.deepEqual(row, {
      date: '2024-02-15',
      label: 'Plein gasoil',
      amount: 120.5,
      category: 'fuel',
      description: null,
    })
  })

  test('retourne des clés i18n par colonne, jamais des messages en dur', ({ assert }) => {
    const { errors, row } = validateExpenseRow({
      date: 'hier',
      label: '',
      amount: 'abc',
      category: 'loisirs',
    })

    assert.isNull(row)
    assert.deepEqual(
      errors.map((e) => [e.column, e.key]),
      [
        ['date', 'flash.csv.rowErrors.dateInvalidFormatFlexible'],
        ['label', 'flash.csv.rowErrors.labelRequired'],
        ['amount', 'flash.csv.rowErrors.amountInvalid'],
        ['category', 'flash.csv.rowErrors.categoryInvalid'],
      ]
    )
    assert.include(errors[3].params?.values, 'fuel')
  })

  test('montant vide et libellé trop long', ({ assert }) => {
    const { errors } = validateExpenseRow({
      date: '2024-01-01',
      label: 'x'.repeat(256),
      amount: '',
    })

    assert.deepEqual(
      errors.map((e) => e.key),
      ['flash.csv.rowErrors.labelTooLong', 'flash.csv.rowErrors.amountRequired']
    )
    assert.equal(errors[0].params?.max, '255')
  })
})

test.group('parseExpenseTable (unit)', () => {
  test('aligne aperçu, lignes validées et statuts', ({ assert }) => {
    const result = parseExpenseTable({
      headers: ['date', 'libellé', 'montant', 'catégorie'],
      rows: [
        ['2024-01-15', 'Antifouling', '350', 'maintenance'],
        ['2024-01-16', '', '20', ''],
      ],
    })

    assert.equal(result.totalRows, 2)
    assert.isFalse(result.tooManyRows)
    assert.deepEqual(result.missingHeaders, [])
    assert.deepEqual(
      result.previewRows.map((r) => [r.line, r.status]),
      [
        [2, 'valid'],
        [3, 'invalid'],
      ]
    )
    assert.lengthOf(result.validRows, 1)
    assert.isNull(result.parsed[1])
    assert.equal(result.previewRows[0].raw['label'], 'Antifouling')
  })

  test('en-têtes manquantes : aucune ligne n’est validée', ({ assert }) => {
    const result = parseExpenseTable({
      headers: ['date', 'label'],
      rows: [['2024-01-15', 'Antifouling']],
    })

    assert.deepEqual(result.missingHeaders, ['amount'])
    assert.lengthOf(result.validRows, 0)
    assert.lengthOf(result.previewRows, 1)
  })

  test('au-delà du plafond, rien n’est validé ni conservé', ({ assert }) => {
    const rows = Array.from({ length: CSV_IMPORT_MAX_ROWS + 1 }, () => ['2024-01-15', 'x', '1'])
    const result = parseExpenseTable({ headers: ['date', 'label', 'amount'], rows })

    assert.isTrue(result.tooManyRows)
    assert.equal(result.totalRows, CSV_IMPORT_MAX_ROWS + 1)
    assert.lengthOf(result.previewRows, 0)
  })
})

test.group('expenseDuplicateKey (unit)', () => {
  test('ignore la casse et les espaces du libellé, normalise le montant', ({ assert }) => {
    assert.equal(
      expenseDuplicateKey('2024-01-15', ' Antifouling ', 350),
      expenseDuplicateKey('2024-01-15', 'antifouling', 350.0)
    )
    assert.notEqual(
      expenseDuplicateKey('2024-01-15', 'Antifouling', 350),
      expenseDuplicateKey('2024-01-15', 'Antifouling', 350.5)
    )
  })
})
