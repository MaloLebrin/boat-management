import type { DeviceInfo } from '../types/user_session.js'

/**
 * Lecture volontairement sommaire du user-agent (#885) : de quoi afficher
 * « Chrome sur macOS » et reconnaître un appareil déjà vu, pas une détection
 * fine. L'ordre compte — Edge et Opera se déclarent aussi « Chrome », et
 * Chrome se déclare aussi « Safari ».
 */
const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

function firstMatch(value: string, patterns: ReadonlyArray<[RegExp, string]>): string | null {
  for (const [pattern, label] of patterns) {
    if (pattern.test(value)) return label
  }
  return null
}

export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) return { browser: null, os: null }
  return { browser: firstMatch(userAgent, BROWSERS), os: firstMatch(userAgent, SYSTEMS) }
}

/** Empreinte d'appareil comparée entre deux connexions : navigateur + système. */
export function deviceFingerprint(userAgent: string | null | undefined): string {
  const { browser, os } = parseUserAgent(userAgent)
  return `${browser ?? '?'}|${os ?? '?'}`
}
