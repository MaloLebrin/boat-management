import { describe, expect, test, vi } from 'vitest'

const mockLocale = { value: 'en' }

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
}))

import { useNumberFormat } from '../../inertia/composables/use_number_format'

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
})
