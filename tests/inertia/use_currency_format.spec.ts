import { test, expect } from 'vitest'
import { useCurrencyFormat } from '../../inertia/composables/use_currency_format'

const { formatCurrency, formatCurrencyNoDecimals } = useCurrencyFormat()

test('formatCurrency formats zero as 0,00 €', () => {
  expect(formatCurrency(0)).toBe('0,00 €')
})

test('formatCurrency formats a positive amount with two decimals', () => {
  expect(formatCurrency(1234.5)).toBe('1 234,50 €')
})

test('formatCurrency formats a negative amount', () => {
  expect(formatCurrency(-50)).toBe('-50,00 €')
})

test('formatCurrencyNoDecimals rounds down', () => {
  expect(formatCurrencyNoDecimals(99.4)).toBe('99 €')
})

test('formatCurrencyNoDecimals rounds up', () => {
  expect(formatCurrencyNoDecimals(99.5)).toBe('100 €')
})

test('formatCurrencyNoDecimals formats zero without decimals', () => {
  expect(formatCurrencyNoDecimals(0)).toBe('0 €')
})

test('formatCurrencyNoDecimals formats large amounts', () => {
  expect(formatCurrencyNoDecimals(12000)).toBe('12 000 €')
})
