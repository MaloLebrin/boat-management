import { describe, expect, test } from 'vitest'
import { installSignalKPath } from '../../inertia/lib/signalk/install_page'

describe('installSignalKPath (#1023)', () => {
  test('chemin localisé, avec ancre facultative', () => {
    expect(installSignalKPath('fr')).toBe('/fr/installer-signal-k-a-bord')
    expect(installSignalKPath('en', 'https')).toBe('/en/install-signal-k-on-board#https')
  })
})
