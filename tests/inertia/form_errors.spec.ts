import { test, expect } from 'vitest'
import { getFieldError, nameToErrorKey } from '../../inertia/utils/form_errors'

test('nameToErrorKey converts bracket notation to dot notation', () => {
  expect(nameToErrorKey('foo')).toBe('foo')
  expect(nameToErrorKey('parts[0][name]')).toBe('parts.0.name')
  expect(nameToErrorKey('items[12].value')).toBe('items.12.value')
})

test('getFieldError returns first string error', () => {
  expect(getFieldError(undefined, 'a')).toBeUndefined()
  expect(getFieldError({ a: 'Err' }, 'a')).toBe('Err')
  expect(getFieldError({ a: ['Err1', 'Err2'] }, 'a')).toBe('Err1')
  expect(getFieldError({ a: undefined }, 'a')).toBeUndefined()
})
