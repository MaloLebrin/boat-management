import { describe, expect, test } from 'vitest'

import { formatLength, parseDecimalInput } from '../../shared/helpers/number_format'

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
