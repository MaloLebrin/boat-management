import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SettingsAuditLogTab from '../../inertia/components/settings/tabs/SettingsAuditLogTab.vue'
import { AUDIT_ACTIONS } from '../../shared/types/audit_log'
import type { AuditLogEntry } from '../../shared/types/audit_log'

vi.mock('@inertiajs/vue3', () => ({
  router: { get: vi.fn() },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 1,
    userId: 3,
    userFullName: 'Alice Skipper',
    userEmail: 'alice@example.com',
    action: 'login',
    entityType: null,
    entityId: null,
    metadata: null,
    createdAt: '2026-08-19T10:00:00.000+02:00',
    ...overrides,
  }
}

function mountTab(data: AuditLogEntry[]) {
  return mount(SettingsAuditLogTab, {
    props: {
      auditLog: {
        data,
        meta: { total: data.length, perPage: 25, currentPage: 1, lastPage: 1 },
      },
      filters: {},
      members: [{ id: 3, fullName: 'Alice Skipper', email: 'alice@example.com' }],
    },
  })
}

describe('SettingsAuditLogTab — action coverage (#474)', () => {
  test('exposes a filter option for every audited action', () => {
    const w = mountTab([])
    const options = w.findAll('option').map((o) => o.attributes('value'))

    for (const action of AUDIT_ACTIONS) {
      expect(options).toContain(action)
    }
  })

  test('offers the invitation and maintenance-task filters added by #474', () => {
    const w = mountTab([])
    const options = w.findAll('option').map((o) => o.attributes('value'))

    expect(options).toContain('invitation.send')
    expect(options).toContain('invitation.cancel')
    expect(options).toContain('invitation.accept')
    expect(options).toContain('maintenance_task.create')
    expect(options).toContain('maintenance_task.complete')
    expect(options).toContain('maintenance_task.delete')
  })

  test('labels every action through i18n, never a raw action key', () => {
    const w = mountTab(AUDIT_ACTIONS.map((action, index) => entry({ id: index + 1, action })))
    const text = w.text()

    for (const action of AUDIT_ACTIONS) {
      expect(text).toContain(`settings.auditLog.actions.${action.replaceAll('.', '_')}`)
    }
  })

  test('renders the task title and the invitee email in the details column', () => {
    const w = mountTab([
      entry({ id: 1, action: 'maintenance_task.create', metadata: { name: 'Vidange moteur' } }),
      entry({ id: 2, action: 'invitation.send', metadata: { email: 'newbie@example.com' } }),
    ])
    const text = w.text()

    expect(text).toContain('Vidange moteur')
    expect(text).toContain('newbie@example.com')
  })
})
