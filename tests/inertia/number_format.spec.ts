import { describe, expect, test } from 'vitest'

import {
  currencyLabel,
  currencyOptions,
  formatCurrency,
  formatLength,
  isCurrencyCode,
  parseDecimalInput,
  toCurrencyCode,
  toMinorUnits,
} from '../../shared/helpers/number_format'
import { SUPPORTED_CURRENCIES } from '../../shared/types/currency'

// #464: « 10.5 » tapé au pavé numérique se transformait en « 5 ». Ces tests
// figent les deux moitiés du correctif : lire une saisie sans la perdre, et
// rendre une longueur avec le séparateur de la locale.
describe('parseDecimalInput', () => {
  test('reads both decimal separators', () => {
    expect(parseDecimalInput('10.5')).toBe(10.5)
    expect(parseDecimalInput('10,5')).toBe(10.5)
  })

  test('reads an integer and tolerates surrounding spaces', () => {
    expect(parseDecimalInput('12')).toBe(12)
    expect(parseDecimalInput('  12  ')).toBe(12)
  })

  test('returns null — never 0 — for an empty or unreadable field', () => {
    // `Number('')` is 0: fed back into a controlled input, that 0 overwrites
    // what the user is typing. Hence null.
    expect(parseDecimalInput('')).toBeNull()
    expect(parseDecimalInput('   ')).toBeNull()
    expect(parseDecimalInput(null)).toBeNull()
    expect(parseDecimalInput(undefined)).toBeNull()
    expect(parseDecimalInput('abc')).toBeNull()
    expect(parseDecimalInput('1.2.3')).toBeNull()
    expect(parseDecimalInput('-')).toBeNull()
  })

  test('keeps a negative value readable (range checks belong to the caller)', () => {
    expect(parseDecimalInput('-3.5')).toBe(-3.5)
  })
})

describe('formatLength', () => {
  test('uses the locale decimal separator and spaces the unit', () => {
    expect(formatLength(10.5, 'fr')).toBe(
      new Intl.NumberFormat('fr-FR', {
        style: 'unit',
        unit: 'meter',
        unitDisplay: 'short',
      }).format(10.5)
    )
    expect(formatLength(10.5, 'fr').replace(/[\u00a0\u202f]/g, ' ')).toBe('10,5 m')
    expect(formatLength(10.5, 'en').replace(/[\u00a0\u202f]/g, ' ')).toBe('10.5 m')
  })

  test('never glues the unit to the number', () => {
    expect(formatLength(12, 'fr')).not.toContain('12m')
    expect(formatLength(12, 'en')).not.toContain('12m')
  })

  test('falls back to en for an unknown locale', () => {
    expect(formatLength(10.5, undefined).replace(/[\u00a0\u202f]/g, ' ')).toBe('10.5 m')
  })
})

// #627 — la devise est une donnée, la locale ne décide que de la forme.
describe('formatCurrency (multi-devises)', () => {
  const plain = (value: string) => value.replace(new RegExp('[\\u00a0\\u202f]', 'g'), ' ')

  test('a currency keeps its symbol whatever the locale', () => {
    expect(plain(formatCurrency(1200.5, 'en', { currency: 'AUD' }))).toBe('A$1,200.50')
    expect(plain(formatCurrency(1200.5, 'fr', { currency: 'AUD' }))).toBe('1 200,50 $AU')
    expect(plain(formatCurrency(1200.5, 'fr', { currency: 'USD' }))).toBe('1 200,50 $US')
  })

  test('applies the currency own decimals by default', () => {
    expect(plain(formatCurrency(1200, 'en', { currency: 'JPY' }))).toBe('¥1,200')
    expect(plain(formatCurrency(1200, 'fr', { currency: 'XPF' }))).not.toContain(',00')
    expect(plain(formatCurrency(1200, 'fr'))).toBe('1 200,00 €')
  })

  test('an explicit precision still wins', () => {
    expect(plain(formatCurrency(1234.56, 'en', { currency: 'USD', fractionDigits: 0 }))).toBe(
      '$1,235'
    )
  })

  test('an empty currency falls back to the euro', () => {
    expect(plain(formatCurrency(10, 'en', { currency: '' }))).toBe('€10.00')
  })
})

describe('currency codes and options', () => {
  test('isCurrencyCode accepts the supported list only, in upper case', () => {
    expect(isCurrencyCode('AUD')).toBe(true)
    expect(isCurrencyCode('aud')).toBe(false)
    expect(isCurrencyCode('BTC')).toBe(false)
    expect(isCurrencyCode(null)).toBe(false)
  })

  test('toCurrencyCode falls back to EUR', () => {
    expect(toCurrencyCode('USD')).toBe('USD')
    expect(toCurrencyCode(undefined)).toBe('EUR')
    expect(toCurrencyCode('XXX')).toBe('EUR')
  })

  test('options cover every supported currency with a localized name', () => {
    const fr = currencyOptions('fr')
    expect(fr.map((o) => o.value)).toEqual([...SUPPORTED_CURRENCIES])
    expect(fr[0].label).toBe('euro (EUR)')
    expect(currencyOptions('en')[0].label).toBe('Euro (EUR)')
    expect(currencyLabel('AUD', 'en')).toBe('Australian Dollar (AUD)')
  })
})

describe('toMinorUnits (Stripe unit_amount)', () => {
  test('two-decimal currencies are expressed in cents', () => {
    expect(toMinorUnits(120.5, 'EUR')).toBe(12050)
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30)
  })

  test('zero-decimal currencies are not multiplied', () => {
    expect(toMinorUnits(1200, 'JPY')).toBe(1200)
    expect(toMinorUnits(1200, 'XPF')).toBe(1200)
  })
})
