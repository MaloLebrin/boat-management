import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: { 'settings.billing.usage.of': 'of' }, locale: 'en' } }),
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
    // MB path, not the thousands-separated raw number
    expect(wrapper.text()).toContain('settings.billing.usage.mb')
    expect(wrapper.text()).not.toContain('5242880')
  })
})
