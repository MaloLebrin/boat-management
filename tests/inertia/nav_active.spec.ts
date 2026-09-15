import { describe, expect, test } from 'vitest'
import { isNavPathActive } from '~/utils/nav_active'

/**
 * Sidebar : une fiche moteur `/boats/:id/engines/:id` allumait « Bateaux » et
 * « Moteurs » en même temps (match par sous-chaîne). Match par segment désormais.
 */
describe('isNavPathActive', () => {
  test('une fiche moteur de bateau active Bateaux mais pas Moteurs', () => {
    expect(isNavPathActive('/boats/1/engines/2', '/boats')).toBe(true)
    expect(isNavPathActive('/boats/1/engines/2', '/engines')).toBe(false)
  })

  test('le chemin exact, avec query ou ancre, est actif', () => {
    expect(isNavPathActive('/engines', '/engines')).toBe(true)
    expect(isNavPathActive('/engines?status=ok', '/engines')).toBe(true)
    expect(isNavPathActive('/engines#list', '/engines')).toBe(true)
    expect(isNavPathActive('/dashboard', '/dashboard')).toBe(true)
  })

  test('un préfixe sans frontière de segment ne matche pas', () => {
    expect(isNavPathActive('/boatsX', '/boats')).toBe(false)
    expect(isNavPathActive('/navigation/fuel', '/navigation/logbook')).toBe(false)
  })
})
