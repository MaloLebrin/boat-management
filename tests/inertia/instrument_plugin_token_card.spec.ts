import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { post, del, flash } = vi.hoisted(() => ({
  post: vi.fn(),
  del: vi.fn(),
  flash: { value: {} as Record<string, unknown> },
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { post, delete: del },
  usePage: () => ({ props: { flash: flash.value, appT: {}, locale: 'fr' } }),
}))
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (v: string) => `d:${v}` }),
}))

import InstrumentPluginTokenCard from '../../inertia/components/boats/show/tabs/instruments/InstrumentPluginTokenCard.vue'
import type { InstrumentSourceRow } from '../../shared/types/instruments'

const source = (over: Partial<InstrumentSourceRow> = {}): InstrumentSourceRow => ({
  id: 1,
  boatId: 5,
  kind: 'signalk',
  baseUrl: 'https://sk.local:3443',
  vesselContext: 'vessels.self',
  enabled: true,
  hasToken: false,
  hasIngestToken: false,
  ingestTokenIssuedAt: null,
  lastSeenAt: null,
  lastError: null,
  ...over,
})

const mountCard = (row = source()) =>
  mount(InstrumentPluginTokenCard, { props: { boatId: 5, source: row } })

beforeEach(() => {
  post.mockClear()
  del.mockClear()
  flash.value = {}
})

describe('InstrumentPluginTokenCard (#994)', () => {
  test('sans jeton : propose de le générer, et l’adresse d’ingestion est affichée', async () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('instruments.plugin.none')
    expect(
      (wrapper.find('input[name="ingestEndpoint"]').element as HTMLInputElement).value
    ).toMatch(/\/api\/instruments\/ingest$/)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.plugin.generate')!
      .trigger('click')
    expect(post).toHaveBeenCalledWith(
      '/boats/5/instrument-source/ingest-token',
      {},
      {
        preserveScroll: true,
      }
    )
  })

  test('affiche le jeton en clair seulement quand le flash le porte', () => {
    expect(mountCard().find('[data-testid="instrument-plugin-fresh-token"]').exists()).toBe(false)

    flash.value = { instrumentIngestToken: 'fai_ing_secret' }
    const wrapper = mountCard(source({ hasIngestToken: true, ingestTokenIssuedAt: '2026-10-22' }))
    const input = wrapper.find('input[name="ingestToken"]')
    expect((input.element as HTMLInputElement).value).toBe('fai_ing_secret')
    expect(wrapper.text()).toContain('instruments.plugin.tokenOnce')
  })

  test('avec un jeton : date d’émission, rotation et révocation confirmées', async () => {
    const wrapper = mount(InstrumentPluginTokenCard, {
      props: {
        boatId: 5,
        source: source({ hasIngestToken: true, ingestTokenIssuedAt: '2026-10-22' }),
      },
      attachTo: document.body,
    })
    expect(wrapper.find('[data-testid="instrument-plugin-status"]').text()).toContain(
      'd:2026-10-22'
    )
    expect(wrapper.text()).not.toContain('instruments.plugin.generate')

    const buttons = (label: string) =>
      [...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === label)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.plugin.rotate')!
      .trigger('click')
    expect(post).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('instruments.plugin.rotateMessage')
    buttons('instruments.plugin.rotate').at(-1)!.click()
    await wrapper.vm.$nextTick()
    expect(post).toHaveBeenCalledTimes(1)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.plugin.revoke')!
      .trigger('click')
    expect(document.body.textContent).toContain('instruments.plugin.revokeMessage')
    buttons('instruments.plugin.revoke').at(-1)!.click()
    await wrapper.vm.$nextTick()
    expect(del).toHaveBeenCalledWith('/boats/5/instrument-source/ingest-token', {
      preserveScroll: true,
    })
    wrapper.unmount()
  })
})
