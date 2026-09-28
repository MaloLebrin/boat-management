import { test } from '@japa/runner'
import { decimalColumnToNumber, formatCurrency } from '#shared/helpers/number_format'

/** Les espaces insécables (fines ou non) d'ICU deviennent des espaces simples. */
const ICU_SPACES = new RegExp('[\u00a0\u202f]', 'g')

function plain(value: string): string {
  return value.replace(ICU_SPACES, ' ')
}

test.group('number_format — formatCurrency', () => {
  test('follows the reader locale: fr groups with spaces, en prefixes the symbol', ({ assert }) => {
    assert.equal(plain(formatCurrency(1234.5, 'fr')), '1 234,50 €')
    assert.equal(plain(formatCurrency(1234.5, 'en')), '€1,234.50')
  })

  test('rounds to whole euros when asked (simulator estimates)', ({ assert }) => {
    assert.equal(plain(formatCurrency(1200, 'fr', { fractionDigits: 0 })), '1 200 €')
    assert.equal(plain(formatCurrency(3400.6, 'en', { fractionDigits: 0 })), '€3,401')
  })

  test('accepts another currency (invoice currency column)', ({ assert }) => {
    assert.equal(plain(formatCurrency(99, 'en', { currency: 'USD' })), '$99.00')
  })

  test('never depends on the server locale: an unknown locale falls back to English', ({
    assert,
  }) => {
    assert.equal(plain(formatCurrency(10, null)), '€10.00')
    assert.equal(plain(formatCurrency(10, 'xx')), '€10.00')
  })
})

test.group('number_format — decimalColumnToNumber', () => {
  test('reads the string Lucid returns for a PostgreSQL decimal column', ({ assert }) => {
    assert.strictEqual(decimalColumnToNumber('120.50'), 120.5)
    assert.strictEqual(decimalColumnToNumber('0.00'), 0)
  })

  test('passes a number through unchanged', ({ assert }) => {
    assert.strictEqual(decimalColumnToNumber(42), 42)
  })

  test('an empty column (null or undefined) stays null', ({ assert }) => {
    assert.isNull(decimalColumnToNumber(null))
    assert.isNull(decimalColumnToNumber(undefined))
  })

  test('a value that does not read as a finite number gives null', ({ assert }) => {
    assert.isNull(decimalColumnToNumber('abc'))
    assert.isNull(decimalColumnToNumber(Number.NaN))
    assert.isNull(decimalColumnToNumber(Number.POSITIVE_INFINITY))
  })
})
