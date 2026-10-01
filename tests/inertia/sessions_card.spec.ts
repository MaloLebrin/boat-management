import { describe, expect, test, vi } from 'vitest'
import { routerSpies } from './helpers/inertia_mock'
import { mountWithStubs } from './helpers/mount'
import type { UserSessionRow, UserSessionsSettingsProps } from '../../shared/types/user_session'

/** Carte « Appareils et sessions » de `/settings/me` (#885). */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import SessionsCard from '../../inertia/components/settings/me/SessionsCard.vue'
import BaseConfirmModal from '../../inertia/components/base/BaseConfirmModal.vue'

function row(overrides: Partial<UserSessionRow> = {}): UserSessionRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    device: { browser: 'Chrome', os: 'macOS' },
    ipAddress: '203.0.113.7',
    createdAt: '2026-09-28T08:00:00.000Z',
    lastSeenAt: '2026-10-01T08:00:00.000Z',
    isCurrent: false,
    remembered: false,
    ...overrides,
  }
}

function mountCard(overrides: Partial<UserSessionsSettingsProps> = {}) {
  const sessions: UserSessionsSettingsProps = {
    sessions: [
      row({ id: 'current-id', isCurrent: true, device: { browser: 'Firefox', os: 'Linux' } }),
      row({ remembered: true }),
    ],
    orphanRememberedCount: 0,
    notifyNewLogin: true,
    ...overrides,
  }
  return mountWithStubs(SessionsCard, { props: { sessions } as Record<string, unknown> })
}

describe('SessionsCard', () => {
  test('lists sessions, flags the current one and offers no sign-out for it', () => {
    const w = mountCard()
    const rows = w.findAll('[data-testid="session-row"]')

    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('settings.sessions.current')
    expect(rows[0].find('button').exists()).toBe(false)
    expect(rows[1].text()).toContain('settings.sessions.remembered')
    expect(rows[1].find('button').exists()).toBe(true)
    w.unmount()
  })

  test('signs out another session only after confirmation', async () => {
    routerSpies.delete.mockClear()
    const w = mountCard()

    await w.findAll('[data-testid="session-row"]')[1].find('button').trigger('click')
    expect(routerSpies.delete).not.toHaveBeenCalled()

    w.findAllComponents(BaseConfirmModal)[0].vm.$emit('confirm')
    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/settings/sessions/11111111-1111-4111-8111-111111111111',
      { preserveScroll: true }
    )
    w.unmount()
  })

  test('signs out everywhere else after confirmation', async () => {
    routerSpies.delete.mockClear()
    const w = mountCard()

    await w.find('[data-testid="sessions-revoke-others"]').trigger('click')
    w.findAllComponents(BaseConfirmModal)[1].vm.$emit('confirm')

    expect(routerSpies.delete).toHaveBeenCalledWith('/settings/sessions/others', {
      preserveScroll: true,
    })
    w.unmount()
  })

  test('shows older remembered sign-ins only when there are some', async () => {
    routerSpies.delete.mockClear()
    expect(mountCard().find('[data-testid="sessions-orphans"]').exists()).toBe(false)

    const w = mountCard({ orphanRememberedCount: 2 })
    await w.find('[data-testid="sessions-orphans"] button').trigger('click')
    expect(routerSpies.delete).toHaveBeenCalledWith('/settings/sessions/remembered', {
      preserveScroll: true,
    })
    w.unmount()
  })

  test('toggles the new-device email alert', async () => {
    routerSpies.put.mockClear()
    const w = mountCard({ notifyNewLogin: true })

    await w.find('button[role="switch"]').trigger('click')
    expect(routerSpies.put).toHaveBeenCalledWith(
      '/settings/sessions/notifications',
      { enabled: false },
      { preserveScroll: true }
    )
    w.unmount()
  })

  test('says so when no other session is open', () => {
    const w = mountCard({ sessions: [row({ isCurrent: true })] })
    expect(w.text()).toContain('settings.sessions.empty')
    w.unmount()
  })
})
