import { describe, expect, test, vi } from 'vitest'

const mockLocale = { value: 'en' }

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
}))

import { useNumberFormat } from '../../inertia/composables/use_number_format'

/** Les espaces insécables (fines ou non) d'ICU deviennent des espaces simples. */
const ICU_SPACES = new RegExp('[\\u00a0\\u202f]', 'g')
const plain = (value: string) => value.replace(ICU_SPACES, ' ')

describe('useNumberFormat', () => {
  test('formatNumber groups thousands in en (comma)', () => {
    mockLocale.value = 'en'
    const { formatNumber } = useNumberFormat()
    expect(formatNumber(1_000_000)).toBe('1,000,000')
  })

  test('formatNumber groups thousands in fr (narrow no-break space)', () => {
    mockLocale.value = 'fr'
    const { formatNumber } = useNumberFormat()
    // fr-FR uses a narrow no-break space as the grouping separator
    expect(formatNumber(1_000_000)).toBe(new Intl.NumberFormat('fr', {}).format(1_000_000))
    expect(formatNumber(1_000_000)).not.toBe('1000000')
  })

  test('formatNumber honors fraction-digit options and locale decimal separator', () => {
    mockLocale.value = 'fr'
    const { formatNumber } = useNumberFormat()
    // FR decimal separator is a comma, not a dot
    expect(formatNumber(0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('0,0')

    mockLocale.value = 'en'
    const { formatNumber: formatEn } = useNumberFormat()
    expect(formatEn(0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('0.0')
  })

  test('formatCurrency always uses the euro symbol', () => {
    mockLocale.value = 'fr'
    const { formatCurrency } = useNumberFormat()
    const fr = formatCurrency(1200)
    expect(fr).toContain('€')
    expect(fr).not.toContain('$')

    mockLocale.value = 'en'
    const { formatCurrency: currencyEn } = useNumberFormat()
    const en = currencyEn(1200)
    expect(en).toContain('€')
    expect(en).not.toContain('$')
  })

  test('formatCurrency follows the locale grouping/decimals', () => {
    mockLocale.value = 'en'
    const { formatCurrency } = useNumberFormat()
    expect(formatCurrency(0)).toBe(
      new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(0)
    )
    mockLocale.value = 'en'
  })

  // Le composable `use_currency_format` (fr-FR codé en dur) est remplacé par
  // ces deux fonctions : un utilisateur EN lisait `1 234,50 €` sur ses budgets.
  test('formatCurrency renders French amounts for a French session', () => {
    mockLocale.value = 'fr'
    const { formatCurrency } = useNumberFormat()
    expect(plain(formatCurrency(1234.5))).toBe('1 234,50 €')
    expect(plain(formatCurrency(-50))).toBe('-50,00 €')
    mockLocale.value = 'en'
  })

  test('formatCurrency renders English amounts for an English session', () => {
    mockLocale.value = 'en'
    const { formatCurrency } = useNumberFormat()
    expect(plain(formatCurrency(1234.5))).toBe('€1,234.50')
  })

  test('formatCurrency honours the invoice currency', () => {
    mockLocale.value = 'en'
    const { formatCurrency } = useNumberFormat()
    expect(plain(formatCurrency(99, { currency: 'USD' }))).toBe('$99.00')
  })

  test('formatCurrencyNoDecimals rounds to whole euros in the session locale', () => {
    mockLocale.value = 'fr'
    const { formatCurrencyNoDecimals } = useNumberFormat()
    expect(plain(formatCurrencyNoDecimals(99.4))).toBe('99 €')
    expect(plain(formatCurrencyNoDecimals(99.5))).toBe('100 €')
    expect(plain(formatCurrencyNoDecimals(12000))).toBe('12 000 €')

    mockLocale.value = 'en'
    const { formatCurrencyNoDecimals: noDecimalsEn } = useNumberFormat()
    expect(plain(noDecimalsEn(12000))).toBe('€12,000')
  })
})
