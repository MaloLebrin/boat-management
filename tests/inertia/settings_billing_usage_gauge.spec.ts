import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'settings.billing.usage.of': 'of',
        'common.units.kb': 'KB',
        'common.units.mb': 'MB',
        'common.units.gb': 'GB',
      },
      locale: 'en',
    },
  }),
}))

import SettingsBillingUsageGauge from '../../inertia/components/settings/SettingsBillingUsageGauge.vue'

describe('SettingsBillingUsageGauge', () => {
  test('formats large numeric quotas with a thousands separator (en)', () => {
    const wrapper = mount(SettingsBillingUsageGauge, {
      props: { label: 'AI tokens', used: 0, limit: 1_000_000 },
    })
    expect(wrapper.text()).toContain('1,000,000')
    expect(wrapper.text()).not.toContain('1000000')
  })

  test('formats numeric strings too', () => {
    const wrapper = mount(SettingsBillingUsageGauge, {
      props: { label: 'AI tokens', used: '1200', limit: '1000000' },
    })
    expect(wrapper.text()).toContain('1,200')
    expect(wrapper.text()).toContain('1,000,000')
  })

  test('renders the unlimited label when limit is null', () => {
    const wrapper = mount(SettingsBillingUsageGauge, {
      props: { label: 'Boats', used: 3, limit: null },
    })
    expect(wrapper.text()).toContain('settings.billing.usage.unlimited')
  })

  test('keeps byte formatting untouched for storage', () => {
    const wrapper = mount(SettingsBillingUsageGauge, {
      props: { label: 'Storage', used: 5 * 1024 * 1024, limit: 100 * 1024 * 1024, isBytes: true },
    })
    // MB path, not the thousands-separated raw number. L'unité vient de
    // `common.units.*` (partagée avec les listes de documents) et non plus
    // d'une clé propre à la facturation.
    expect(wrapper.text()).toContain('5 MB')
    expect(wrapper.text()).toContain('100 MB')
    expect(wrapper.text()).not.toContain('5242880')
  })

  test('passe au palier Go avec une décimale', () => {
    const wrapper = mount(SettingsBillingUsageGauge, {
      props: {
        label: 'Storage',
        used: 1.44 * 1024 * 1024 * 1024,
        limit: 5 * 1024 * 1024 * 1024,
        isBytes: true,
      },
    })
    expect(wrapper.text()).toContain('1.4 GB')
    expect(wrapper.text()).toContain('5.0 GB')
  })
})

describe('dark mode (#416)', () => {
  test('la piste de jauge utilise bg-surface-muted, pas le token fantôme bg-surface-2', () => {
    const html = mount(SettingsBillingUsageGauge, {
      props: { label: 'Boats', used: 3, limit: 8 },
    }).html()
    expect(html).toContain('bg-surface-muted')
    expect(html).not.toContain('surface-2')
  })

  test('le dépassement de quota utilise la palette coral, pas red', () => {
    const html = mount(SettingsBillingUsageGauge, {
      props: { label: 'Boats', used: 12, limit: 8 },
    }).html()
    expect(html).toContain('bg-coral-600')
    expect(html).not.toMatch(/-red-\d/)
  })
})
