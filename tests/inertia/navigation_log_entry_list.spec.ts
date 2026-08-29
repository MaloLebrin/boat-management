import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import NavigationLogEntryList from '../../inertia/components/boats/navigation-log/NavigationLogEntryList.vue'
import type { NavigationLogEntryRow } from '../../shared/types/navigation_log'

const mockRouterDelete = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

vi.mock('~/components/boats/navigation-log/NavigationLogEntryEditForm.vue', () => ({
  default: { template: '<div class="edit-form-stub" />', props: ['boatId', 'logId', 'entry'] },
}))

function entry(overrides: Partial<NavigationLogEntryRow> = {}): NavigationLogEntryRow {
  return {
    id: 1,
    navigationLogId: 5,
    recordedAt: '2026-08-29T10:00:00.000Z',
    latitude: 47.2735,
    longitude: -2.2137,
    gpsAccuracyM: 6.5,
    cogDeg: 210,
    sogKn: 5.4,
    sailConfig: 'GV + solent',
    note: 'envoi du spi',
    twdDeg: null,
    twaDeg: null,
    createdAt: '2026-08-29T10:00:05.000Z',
    updatedAt: '2026-08-29T10:00:05.000Z',
    ...overrides,
  }
}

describe('NavigationLogEntryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('affiche COG/SOG quand la vitesse est significative', () => {
    const wrapper = mount(NavigationLogEntryList, {
      props: { boatId: 7, logId: 5, entries: [entry()], canEdit: false },
    })
    expect(wrapper.text()).toContain('210°')
    expect(wrapper.text()).toContain('5.4')
  })

  test('affiche « vitesse quasi nulle » quand sog = 0', () => {
    const wrapper = mount(NavigationLogEntryList, {
      props: {
        boatId: 7,
        logId: 5,
        entries: [entry({ sogKn: 0, cogDeg: null })],
        canEdit: false,
      },
    })
    expect(wrapper.text()).toContain('navigation_logs.entries.sogNearZero')
    expect(wrapper.text()).not.toContain('210°')
  })

  test('masque les actions sans droit d’édition', () => {
    const wrapper = mount(NavigationLogEntryList, {
      props: { boatId: 7, logId: 5, entries: [entry()], canEdit: false },
    })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  test('supprime un point après confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    const wrapper = mount(NavigationLogEntryList, {
      props: { boatId: 7, logId: 5, entries: [entry()], canEdit: true },
    })

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    expect(mockRouterDelete).toHaveBeenCalledWith(
      '/boats/7/navigation-logs/5/entries/1',
      expect.objectContaining({ preserveScroll: true })
    )
    vi.unstubAllGlobals()
  })

  test('état vide', () => {
    const wrapper = mount(NavigationLogEntryList, {
      props: { boatId: 7, logId: 5, entries: [], canEdit: false },
    })
    expect(wrapper.text()).toContain('navigation_logs.entries.empty')
  })
})
