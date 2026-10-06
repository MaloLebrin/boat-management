import { describe, expect, test } from 'vitest'
import {
  OFFLINE_RETRY_BASE_MS,
  OFFLINE_RETRY_MAX_MS,
  retryDelayMs,
} from '../../../shared/helpers/offline_retry'

describe('retryDelayMs (#950)', () => {
  test('first retry waits the base delay', () => {
    expect(retryDelayMs(1)).toBe(OFFLINE_RETRY_BASE_MS)
  })

  test('doubles at each attempt', () => {
    expect(retryDelayMs(2)).toBe(OFFLINE_RETRY_BASE_MS * 2)
    expect(retryDelayMs(3)).toBe(OFFLINE_RETRY_BASE_MS * 4)
    expect(retryDelayMs(5)).toBe(OFFLINE_RETRY_BASE_MS * 16)
  })

  test('is capped at the maximum delay', () => {
    expect(retryDelayMs(20)).toBe(OFFLINE_RETRY_MAX_MS)
    expect(retryDelayMs(1_000)).toBe(OFFLINE_RETRY_MAX_MS)
  })

  test('treats attempts below 1 as the first attempt', () => {
    expect(retryDelayMs(0)).toBe(OFFLINE_RETRY_BASE_MS)
    expect(retryDelayMs(-3)).toBe(OFFLINE_RETRY_BASE_MS)
  })
})
