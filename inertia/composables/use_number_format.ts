import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import {
  currencyOptions as buildCurrencyOptions,
  toCurrencyCode,
  formatCurrency as renderCurrency,
  formatLength as renderLength,
  formatPrice as renderPrice,
  type FormatCurrencyOptions,
} from '../../shared/helpers/number_format'

// Locale-aware number / currency formatting.
// The locale (fr/en) drives grouping, decimal separator and symbol placement;
// the currency is data (#627): a document's own currency when the caller
// passes one, otherwise the organization's working currency (shared prop
// `organizationCurrency`, EUR on public pages and for legacy orgs).
export function useNumberFormat() {
  const { locale } = useT()
  const page = usePage()

  /** Devise de travail de l'organisation — défaut des montants sans devise propre. */
  const organizationCurrency = computed(() =>
    toCurrencyCode((page.props as Record<string, unknown>).organizationCurrency)
  )

  /** Options `<BaseSelect>` des devises, libellées dans la locale de l'app. */
  const currencyOptions = computed(() => buildCurrencyOptions(locale.value))

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale.value, options).format(value)
  }

  /**
   * `1 234,56 €` · `€1,234.56` — a currency amount in the app locale (#461 for
   * money). Never `Intl.NumberFormat(undefined, …)` in a component: that is
   * the *browser* locale, and never a hardcoded `fr-FR` either.
   */
  function formatCurrency(value: number, options?: FormatCurrencyOptions): string {
    return renderCurrency(value, locale.value, {
      ...options,
      currency: options?.currency || organizationCurrency.value,
    })
  }

  /** `1 234 €` · `€1,234` — whole units (budget axes, simulator estimates). */
  function formatCurrencyNoDecimals(value: number, options?: FormatCurrencyOptions): string {
    return formatCurrency(value, { ...options, fractionDigits: 0 })
  }

  /** `20 €` · `€20` — a whole-euro price, never `${value} €` in a template (#465). */
  function formatPrice(value: number): string {
    return renderPrice(value, locale.value)
  }

  /** `10,5 m` · `10.5 m` — a length in metres, never `${value}m` in a template (#464). */
  function formatLength(value: number): string {
    return renderLength(value, locale.value)
  }

  return {
    formatNumber,
    formatCurrency,
    formatCurrencyNoDecimals,
    formatPrice,
    formatLength,
    organizationCurrency,
    currencyOptions,
  }
}
