import { describe, expect, test } from 'vitest'
import { formatBytes } from '../../inertia/utils/format_bytes'

describe('formatBytes', () => {
  test('renders octets below one kilobyte', () => {
    expect(formatBytes(0)).toBe('0 o')
    expect(formatBytes(1023)).toBe('1023 o')
  })

  test('renders kilobytes with one decimal below one megabyte', () => {
    expect(formatBytes(1024)).toBe('1.0 Ko')
    expect(formatBytes(1536)).toBe('1.5 Ko')
  })

  test('renders megabytes with one decimal from one megabyte', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 Mo')
    expect(formatBytes(2.25 * 1024 * 1024)).toBe('2.3 Mo')
  })
})
