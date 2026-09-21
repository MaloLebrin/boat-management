import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import AboutValuesSection from '../../inertia/components/marketing/about/AboutValuesSection.vue'
import HomeTestimonialsSection from '../../inertia/components/marketing/home/HomeTestimonialsSection.vue'

/**
 * Les sections marketing se révèlent au scroll via `useScrollReveal`, qui
 * observe l'élément portant `ref="…"`. Le lien passait auparavant par un
 * `:ref="el"` — une liaison dynamique reçoit la valeur *déréférencée* du ref,
 * donc `null` au premier rendu : l'observer n'observait rien, `onMounted`
 * retombait sur son repli « tout visible » et l'animation ne jouait jamais.
 * Ces tests verrouillent le branchement `useTemplateRef` qui l'a remplacé.
 */

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

let observed: Element[] = []
let callbacks: ObserverCallback[] = []
let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  observed = []
  callbacks = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: ObserverCallback) {
        callbacks.push(callback)
      }
      observe(element: Element) {
        observed.push(element)
      }
      disconnect() {}
      unobserve() {}
    }
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
})

function intersect() {
  for (const callback of callbacks) callback([{ isIntersecting: true }])
}

describe('useScrollReveal', () => {
  test("observe la section portant le `ref` par défaut et ne la révèle qu'à l'intersection", async () => {
    wrapper = mount(AboutValuesSection, {
      attachTo: document.body,
      props: {
        eyebrow: 'Valeurs',
        title: 'Nos',
        titleHighlight: 'principes',
        items: [{ n: '01', title: 'Clarté', desc: 'Des coûts lisibles', extra: 'Sans surprise' }],
      },
    })

    const section = wrapper.find('section')
    expect(observed).toEqual([section.element])
    expect(section.classes()).not.toContain('visible')

    intersect()
    await wrapper.vm.$nextTick()

    expect(section.classes()).toContain('visible')
  })

  test('observe la section quand le `ref` porte un nom explicite', async () => {
    wrapper = mount(HomeTestimonialsSection, {
      attachTo: document.body,
      props: {
        title: 'Ils naviguent avec nous',
        items: [{ quote: 'Enfin clair', author: 'Marie', role: 'Loueuse' }],
      },
    })

    const section = wrapper.find('section')
    expect(observed).toEqual([section.element])
    expect(section.classes()).not.toContain('visible')

    intersect()
    await wrapper.vm.$nextTick()

    expect(section.classes()).toContain('visible')
  })
})
