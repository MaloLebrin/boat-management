import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import BaseTabs from '../../inertia/components/base/BaseTabs.vue'

test('emits update:modelValue on click', async () => {
  const w = mount(BaseTabs, {
    props: {
      modelValue: 'a',
      tabs: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ],
    },
  })
  await w.findAll('button')[1].trigger('click')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
})

describe('débordement mobile (#495)', () => {
  function mountTabs() {
    return mount(BaseTabs, {
      props: {
        modelValue: 'a',
        tabs: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
          { key: 'c', label: 'C' },
        ],
      },
    })
  }

  test('la barre est scrollable horizontalement avec snap', () => {
    const w = mountTabs()
    const bar = w.find('.overflow-x-auto')
    expect(bar.exists()).toBe(true)
    expect(bar.classes()).toContain('snap-x')
    expect(w.findAll('button').every((b) => b.classes().includes('snap-start'))).toBe(true)
  })

  test("les dégradés de bord n'apparaissent que quand des onglets débordent", async () => {
    const w = mountTabs()
    expect(w.find('[data-overflow]').exists()).toBe(false)

    // happy-dom ne calcule pas de layout : on simule un conteneur qui déborde
    const el = w.find('.overflow-x-auto').element as HTMLElement
    Object.defineProperty(el, 'scrollWidth', { value: 600, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(el, 'scrollLeft', { value: 50, writable: true, configurable: true })
    await w.find('.overflow-x-auto').trigger('scroll')

    expect(w.find('[data-overflow="left"]').exists()).toBe(true)
    expect(w.find('[data-overflow="right"]').exists()).toBe(true)

    // Arrivé au bout : le dégradé droit disparaît
    el.scrollLeft = 300
    await w.find('.overflow-x-auto').trigger('scroll')
    expect(w.find('[data-overflow="right"]').exists()).toBe(false)
    expect(w.find('[data-overflow="left"]').exists()).toBe(true)
  })

  test("l'écran d'inspection bascule ses deux panneaux en onglets sous lg", async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(
      resolve(process.cwd(), 'inertia/pages/boats/reservation_inspection.vue'),
      'utf8'
    )
    // Onglets visibles seulement sous lg ; les panneaux gardent la grille 2
    // colonnes au-dessus, et le panneau inactif est masqué en mobile
    expect(source).toContain('lg:hidden')
    expect(source).toContain('BaseTabs')
    expect(source).toContain('lg:grid-cols-2')
    expect(source).toContain("'hidden lg:block'")
    expect(source).toContain("t('inspections.kind.checkout')")
    expect(source).toContain("t('inspections.kind.checkin')")
  })
})

describe('dark mode (#416)', () => {
  function mountTabs() {
    return mount(BaseTabs, {
      props: {
        modelValue: 'a',
        tabs: [
          { key: 'a', label: 'A', badge: '3' },
          { key: 'b', label: 'B' },
        ],
      },
    })
  }

  test('la barre et l’indicateur actif reposent sur des tokens de surface', () => {
    const html = mountTabs().html()
    expect(html).toContain('bg-surface-muted')
    expect(html).toContain('bg-surface-elevated')
    expect(html).not.toContain('bg-white')
  })

  test('la pastille de compteur utilise brand-soft / brand, inversés en sombre', () => {
    const badge = mountTabs().find('.rounded-full').classes().join(' ')
    expect(badge).toContain('bg-brand-soft')
    expect(badge).toContain('text-brand')
    // `bg-navy-100 text-navy-700` gardait un fond clair sur une page sombre.
    expect(badge).not.toMatch(/navy-(50|100)\b/)
  })
})
