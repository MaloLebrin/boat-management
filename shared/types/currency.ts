/**
 * Devises de travail proposées aux organisations (#627).
 *
 * La devise est une *donnée* (un réglage d'organisation, ou la devise propre
 * d'une facture / d'un tarif), jamais déduite de la langue : la locale fr/en
 * décide seulement de la forme (`1 200,50 $AU` vs `A$1,200.50`).
 *
 * Liste fermée plutôt que « tout ISO 4217 » : elle alimente les `<select>`, la
 * validation VineJS et la colonne `organizations.currency`. `XPF` couvre la
 * Polynésie et la Nouvelle-Calédonie, `JPY` et `XPF` n'ont pas de décimales.
 */
export const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'AUD',
  'NZD',
  'CAD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'XPF',
  'JPY',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

/** Devise des organisations existantes et de tout ce qui n'a pas de devise propre. */
export const DEFAULT_CURRENCY: CurrencyCode = 'EUR'

/** Option de `<BaseSelect>` : `Euro (EUR)` · `euro (EUR)` selon la locale. */
export interface CurrencyOption {
  value: CurrencyCode
  label: string
}
