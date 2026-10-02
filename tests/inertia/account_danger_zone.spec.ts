import { describe, expect, test, vi } from 'vitest'
import { Form } from '@adonisjs/inertia/vue'
import { routerSpies } from './helpers/inertia_mock'
import { mountWithStubs } from './helpers/mount'
import type { AccountMembershipRow, OrganizationDeletionProps } from '../../shared/types/account'

/** Zone dangereuse de `/settings/me` et `/settings/org` (#886). */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: ['action', 'resetOnError'],
    template: '<form @submit.prevent><slot :processing="false" :errors="{}" /></form>',
  },
  Link: { name: 'Link', props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

import ExportDataCard from '../../inertia/components/settings/me/account/ExportDataCard.vue'
import MembershipsCard from '../../inertia/components/settings/me/account/MembershipsCard.vue'
import DeleteAccountCard from '../../inertia/components/settings/me/account/DeleteAccountCard.vue'
import DeleteOrganizationCard from '../../inertia/components/settings/org/DeleteOrganizationCard.vue'
import OrganizationDeletionBanner from '../../inertia/components/layout/OrganizationDeletionBanner.vue'
import BaseConfirmModal from '../../inertia/components/base/BaseConfirmModal.vue'

function membership(overrides: Partial<AccountMembershipRow> = {}): AccountMembershipRow {
  return {
    organizationId: 7,
    name: 'Voiles du Ponant',
    role: 'member',
    isCurrent: false,
    leaveBlockedReason: null,
    ...overrides,
  }
}

describe('ExportDataCard', () => {
  test('downloads the JSON export through a plain link', () => {
    const w = mountWithStubs(ExportDataCard)
    expect(w.find('[data-testid="export-my-data"]').attributes('href')).toBe('/settings/me/export')
    w.unmount()
  })
})

describe('MembershipsCard', () => {
  test('leaves an organization only after confirmation', async () => {
    routerSpies.delete.mockClear()
    const w = mountWithStubs(MembershipsCard, {
      props: { memberships: [membership({ isCurrent: true }), membership({ organizationId: 9 })] },
    })

    const rows = w.findAll('[data-testid="membership-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('settings.danger.memberships.current')

    await rows[1].find('button').trigger('click')
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.findComponent(BaseConfirmModal).vm.$emit('confirm')
    expect(routerSpies.delete).toHaveBeenCalledWith('/settings/me/memberships/9', {
      preserveScroll: true,
    })
    w.unmount()
  })

  test('explains why an organization cannot be left, without a button', () => {
    const w = mountWithStubs(MembershipsCard, {
      props: { memberships: [membership({ leaveBlockedReason: 'last_admin' })] },
    })
    const row = w.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="leave-blocked"]').text()).toContain(
      'settings.danger.memberships.blocked.last_admin'
    )
    expect(row.find('button').exists()).toBe(false)
    w.unmount()
  })
})

describe('DeleteAccountCard', () => {
  test('submits a DELETE to /settings/me with the password and the confirmation box', () => {
    const w = mountWithStubs(DeleteAccountCard, { props: { lastAdminOf: [], graceDays: 14 } })
    expect(w.findComponent(Form).props('action')).toEqual({ url: '/settings/me', method: 'delete' })
    const names = w.findAll('input').map((i) => i.attributes('name'))
    expect(names).toEqual(['password', 'confirm'])
    expect(w.find('[data-testid="delete-account-submit"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  test('is replaced by a warning for the last admin of an organization', () => {
    const w = mountWithStubs(DeleteAccountCard, {
      props: { lastAdminOf: ['Voiles du Ponant'], graceDays: 14 },
    })
    expect(w.find('[data-testid="delete-account-blocked"]').exists()).toBe(true)
    expect(w.findComponent(Form).exists()).toBe(false)
    w.unmount()
  })
})

describe('DeleteOrganizationCard', () => {
  const idle: OrganizationDeletionProps = { scheduledFor: null, graceDays: 30 }

  test('asks for the organization name and the password', () => {
    const w = mountWithStubs(DeleteOrganizationCard, {
      props: { deletion: idle, organizationName: 'Voiles du Ponant' },
    })
    expect(w.findComponent(Form).props('action')).toEqual({
      url: '/settings/org',
      method: 'delete',
    })
    expect(w.findAll('input').map((i) => i.attributes('name'))).toEqual([
      'organizationName',
      'password',
    ])
    w.unmount()
  })

  test('offers to cancel a scheduled deletion', async () => {
    routerSpies.post.mockClear()
    const w = mountWithStubs(DeleteOrganizationCard, {
      props: {
        deletion: { scheduledFor: '2026-11-01T08:00:00.000Z', graceDays: 30 },
        organizationName: 'Voiles du Ponant',
      },
    })
    expect(w.find('[data-testid="organization-deletion-scheduled"]').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(routerSpies.post).toHaveBeenCalledWith(
      '/settings/org/restore',
      {},
      { preserveScroll: true }
    )
    w.unmount()
  })
})

describe('OrganizationDeletionBanner', () => {
  test('is hidden without a scheduled deletion', () => {
    const w = mountWithStubs(OrganizationDeletionBanner)
    expect(w.find('[data-testid="organization-deletion-banner"]').exists()).toBe(false)
    w.unmount()
  })

  test('links admins to the organization settings', () => {
    const w = mountWithStubs(OrganizationDeletionBanner, {
      pageProps: {
        organizationDeletionScheduledFor: '2026-11-01T08:00:00.000Z',
        permissions: { capabilities: ['organization.manage'] },
      },
    })
    const banner = w.find('[data-testid="organization-deletion-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.find('a').attributes('href')).toBe('/settings/org')
    w.unmount()
  })

  test('shows the date without the link to other members', () => {
    const w = mountWithStubs(OrganizationDeletionBanner, {
      pageProps: {
        organizationDeletionScheduledFor: '2026-11-01T08:00:00.000Z',
        permissions: { capabilities: [] },
      },
    })
    const banner = w.find('[data-testid="organization-deletion-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.find('a').exists()).toBe(false)
    w.unmount()
  })
})
