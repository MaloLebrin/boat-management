import { useT } from '~/composables/use_t'

// Locale-aware number / currency formatting.
// The app is single-currency (EUR); only the locale (fr/en) drives grouping,
// decimal separator and symbol placement.
export function useNumberFormat() {
  const { locale } = useT()

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale.value, options).format(value)
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(value)
  }

  return { formatNumber, formatCurrency }
}
