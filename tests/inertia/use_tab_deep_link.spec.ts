import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { defineComponent, h } from 'vue'
import { useTabDeepLink } from '../../inertia/composables/use_tab_deep_link'

type Tab = 'info' | 'tasks' | 'photos'
const TABS: readonly Tab[] = ['info', 'tasks', 'photos']

function mountProbe(initialTabParam?: string | null) {
  const Probe = defineComponent({
    setup() {
      const tab = useTabDeepLink<Tab>({ tabs: TABS, defaultTab: 'info', initialTabParam })
      return { tab }
    },
    render() {
      return h('button', { 'data-tab': this.tab, 'onClick': () => (this.tab = 'photos') })
    },
  })
  return mount(Probe)
}

describe('useTabDeepLink', () => {
  const originalUrl = window.location.href

  beforeEach(() => window.history.replaceState({}, '', '/boats/1/sails/2'))
  afterEach(() => window.history.replaceState({}, '', originalUrl))

  test('starts on the tab the server saw, before any onMounted (SSR-safe)', () => {
    const wrapper = mountProbe('photos')
    expect(wrapper.get('button').attributes('data-tab')).toBe('photos')
  })

  test('trusts the server over the window when a param was provided', () => {
    window.history.replaceState({}, '', '/boats/1/sails/2?tab=photos')
    // Le serveur n'a vu aucun `?tab=` : c'est lui qui a rendu la page.
    expect(mountProbe(null).get('button').attributes('data-tab')).toBe('info')
  })

  test('falls back to window.location when no server param is provided', () => {
    window.history.replaceState({}, '', '/boats/1/sails/2?tab=tasks')
    expect(mountProbe(undefined).get('button').attributes('data-tab')).toBe('tasks')
  })

  test('ignores an unknown tab value', () => {
    expect(mountProbe('not-a-tab').get('button').attributes('data-tab')).toBe('info')
  })

  test('mirrors the tab into the URL without a request, and clears it on the default tab', async () => {
    const wrapper = mountProbe(null)

    await wrapper.get('button').trigger('click')
    expect(window.location.search).toBe('?tab=photos')
    ;(wrapper.vm as unknown as { tab: Tab }).tab = 'info'
    await wrapper.vm.$nextTick()
    expect(window.location.search).toBe('')
  })
})
