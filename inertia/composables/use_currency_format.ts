// Hardcoded to fr-FR / EUR — single-currency app assumption
const formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const formatterNoDecimals = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function useCurrencyFormat() {
  return {
    formatCurrency: (v: number) => formatter.format(v),
    formatCurrencyNoDecimals: (v: number) => formatterNoDecimals.format(v),
  }
}
