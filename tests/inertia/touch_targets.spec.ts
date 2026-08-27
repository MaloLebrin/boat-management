import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BaseButton from '../../inertia/components/base/BaseButton.vue'

/**
 * #494 — cibles tactiles ≥ 44 px sur les écrans terrain. happy-dom n'applique
 * pas le CSS : comme le scan de thème, on asserte les noms de classes — la
 * mesure réelle (boundingBox Playwright) relève de #500.
 */

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>', props: ['href', 'route'] },
}))

const TOUCH_CLASS = 'pointer-coarse:before:absolute'

describe('cibles tactiles (#494)', () => {
  test('BaseButton sm/md/icon étendent leur zone tactile sur pointeur grossier', () => {
    for (const size of ['sm', 'md', 'icon'] as const) {
      const wrapper = mount(BaseButton, { props: { size }, slots: { default: 'OK' } })
      const cls = wrapper.attributes('class') ?? ''
      expect(cls, `size=${size} : zone tactile`).toContain(TOUCH_CLASS)
      expect(cls, `size=${size} : positionnement du pseudo`).toContain('relative')
    }
  })

  test('BaseButton lg mesure déjà 44 px et ne porte pas de pseudo-zone', () => {
    const wrapper = mount(BaseButton, { props: { size: 'lg' }, slots: { default: 'OK' } })
    const cls = wrapper.attributes('class') ?? ''
    expect(cls).toContain('h-11')
    expect(cls).not.toContain(TOUCH_CLASS)
  })

  test('la case à cocher des fiches d’entretien porte une pseudo-zone de 44 px', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'inertia/components/boats/sheets/BoatMaintenanceSheetItemRow.vue'),
      'utf8'
    )
    // 20 px visuels (h-5 w-5) + 2 × 12 px de pseudo-zone = 44 px
    expect(source).toContain('h-5 w-5')
    expect(source).toContain('pointer-coarse:before:-inset-3')
  })

  test('le hamburger fait 44 px pleins', () => {
    const source = readFileSync(resolve(process.cwd(), 'inertia/layouts/default.vue'), 'utf8')
    expect(source).toContain('w-11 h-11')
    expect(source).not.toContain('w-10 h-10 rounded-lg text-navy-100')
  })

  test('le bouton de fermeture du drawer porte une pseudo-zone', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'inertia/components/layout/MobileSidebarDrawer.vue'),
      'utf8'
    )
    expect(source).toContain('pointer-coarse:before:-inset-1')
  })
})
