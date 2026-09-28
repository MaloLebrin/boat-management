import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SettingsExportsTab from '../../inertia/components/settings/tabs/SettingsExportsTab.vue'
import type { DataExportRow } from '../../shared/types/export'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
    formatDateTime: (d: string) => d,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

const BASE_STUBS = {
  BaseButton: {
    name: 'BaseButton',
    props: ['variant', 'size', 'disabled', 'type', 'href', 'externalHref'],
    // Rendu réel : un `href` donne une ancre, sinon un bouton.
    template:
      '<a v-if="href" data-base-button :href="href"><slot /></a><button v-else data-base-button><slot /></button>',
  },
  BaseCard: {
    name: 'BaseCard',
    template: '<div data-base-card><slot /></div>',
  },
  BaseBadge: {
    name: 'BaseBadge',
    props: ['variant'],
    template: '<span data-base-badge :data-variant="variant"><slot /></span>',
  },
  BaseEmptyState: {
    name: 'BaseEmptyState',
    props: ['title', 'description'],
    template: '<div data-base-empty-state><p>{{ title }}</p></div>',
  },
  BaseHeading: {
    name: 'BaseHeading',
    props: ['level'],
    template: '<h2 data-base-heading><slot /></h2>',
  },
}

function mountTab(exports: DataExportRow[] = []) {
  return mount(SettingsExportsTab, {
    props: {
      exports,
      threshold: 5000,
      retentionDays: 7,
    },
    global: { stubs: BASE_STUBS },
  })
}

const mockReadyExport: DataExportRow = {
  id: 1,
  type: 'invoices',
  status: 'ready',
  rowCount: 10000,
  filename: 'invoices_2024.csv',
  period: { from: '2024-01-01', to: '2024-12-31' },
  requestedBy: 'user@example.com',
  createdAt: '2024-12-01T10:00:00Z',
  expiresAt: '2024-12-08T10:00:00Z',
  downloadUrl: 'https://example.com/download/signed-url',
}

const mockPendingExport: DataExportRow = {
  id: 2,
  type: 'reservations',
  status: 'pending',
  rowCount: null,
  filename: null,
  period: { from: '2024-06-01', to: null },
  requestedBy: 'user@example.com',
  createdAt: '2024-12-01T11:00:00Z',
  expiresAt: '2024-12-08T11:00:00Z',
  downloadUrl: null,
}

describe('SettingsExportsTab — empty state', () => {
  test('shows empty state when no exports', () => {
    const w = mountTab([])
    expect(w.find('[data-base-empty-state]').exists()).toBe(true)
    expect(w.text()).toContain('settings.exports.empty.title')
  })

  test('does not show empty state when exports exist', () => {
    const w = mountTab([mockReadyExport])
    expect(w.find('[data-base-empty-state]').exists()).toBe(false)
  })
})

describe('SettingsExportsTab — ready export', () => {
  test('renders download link for ready export', () => {
    const w = mountTab([mockReadyExport])

    const downloadLink = w.find('a[href="https://example.com/download/signed-url"]')
    expect(downloadLink.exists()).toBe(true)
    expect(downloadLink.text()).toContain('settings.exports.download')
  })

  test('shows success badge for ready status', () => {
    const w = mountTab([mockReadyExport])

    const badge = w.find('[data-base-badge][data-variant="success"]')
    expect(badge.exists()).toBe(true)
  })

  test('shows row count', () => {
    const w = mountTab([mockReadyExport])
    expect(w.text()).toContain('10000')
  })
})

describe('SettingsExportsTab — pending export', () => {
  test('does not render download link for pending export', () => {
    const w = mountTab([mockPendingExport])

    const links = w.findAll('a')
    const downloadLinks = links.filter((l) => l.attributes('href')?.includes('download'))
    expect(downloadLinks).toHaveLength(0)
  })

  test('shows neutral badge for pending status', () => {
    const w = mountTab([mockPendingExport])

    const badge = w.find('[data-base-badge][data-variant="neutral"]')
    expect(badge.exists()).toBe(true)
  })

  test('shows dash for missing row count', () => {
    const w = mountTab([mockPendingExport])

    // The row count cell should contain a dash
    const table = w.find('table')
    expect(table.text()).toContain('-')
  })
})

describe('SettingsExportsTab — type labels', () => {
  test('displays translated type label', () => {
    const w = mountTab([mockReadyExport])
    expect(w.text()).toContain('settings.exports.types.invoices')
  })
})
