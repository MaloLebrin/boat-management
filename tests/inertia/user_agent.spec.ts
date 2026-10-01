import { describe, expect, test } from 'vitest'
import { deviceFingerprint, parseUserAgent } from '../../shared/helpers/user_agent'

/** Lecture sommaire du user-agent pour la liste des appareils (#885). */
describe('parseUserAgent', () => {
  test.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Chrome',
      'macOS',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
      'Edge',
      'Windows',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Safari',
      'iOS',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox', 'Linux'],
    [
      'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
      'Samsung Internet',
      'Android',
    ],
  ])('%s', (ua, browser, os) => {
    expect(parseUserAgent(ua)).toEqual({ browser, os })
  })

  test('returns nulls for a missing or unknown user-agent', () => {
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null })
    expect(parseUserAgent('curl/8.0')).toEqual({ browser: null, os: null })
  })

  test('fingerprints by browser and system, not by version', () => {
    expect(deviceFingerprint('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Firefox/130.0')).toBe(
      deviceFingerprint('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Firefox/131.0')
    )
  })
})
