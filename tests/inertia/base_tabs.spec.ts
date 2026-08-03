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
