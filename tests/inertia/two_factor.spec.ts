import { describe, expect, test, vi } from 'vitest'
import { routerSpies } from './helpers/inertia_mock'
import { mountWithStubs } from './helpers/mount'
import type {
  OrganizationTwoFactorPolicy,
  TwoFactorSettingsProps,
} from '../../shared/types/two_factor'

/**
 * Écrans de double authentification (#884) : carte de `/settings/me`,
 * politique d'organisation et page du second facteur.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
  Form: {
    name: 'MockInertiaForm',
    props: {
      action: { type: Object, required: false },
      route: { type: String, required: false },
    },
    template:
      '<form :data-url="action?.url ?? route" :data-method="action?.method"><slot :processing="false" :errors="{}" /></form>',
  },
}))

import TwoFactorCard from '../../inertia/components/settings/me/TwoFactorCard.vue'
import TwoFactorPolicyCard from '../../inertia/components/settings/org/TwoFactorPolicyCard.vue'
import TwoFactorChallenge from '../../inertia/pages/auth/two_factor_challenge.vue'

function settings(overrides: Partial<TwoFactorSettingsProps> = {}): TwoFactorSettingsProps {
  return {
    enabled: false,
    recoveryCodesRemaining: 0,
    pendingSetup: null,
    recoveryCodes: null,
    requiredByOrganization: false,
    graceEndsAt: null,
    ...overrides,
  }
}

function mountCard(twoFactor: TwoFactorSettingsProps) {
  return mountWithStubs(TwoFactorCard, { props: { twoFactor } as Record<string, unknown> })
}

function forms(wrapper: ReturnType<typeof mountCard>) {
  return wrapper
    .findAll('form')
    .map((f) => `${f.attributes('data-method')} ${f.attributes('data-url')}`)
}

describe('TwoFactorCard', () => {
  test('without 2FA, offers to start the setup', async () => {
    routerSpies.post.mockClear()
    const w = mountCard(settings())

    expect(w.text()).toContain('settings.security.twoFactor.statusOff')
    await w.find('[data-testid="two-factor-start"]').trigger('click')
    expect(routerSpies.post).toHaveBeenCalledWith(
      '/settings/two-factor',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
    w.unmount()
  })

  test('during setup, shows the QR code, the manual key and the confirm form', async () => {
    routerSpies.delete.mockClear()
    const w = mountCard(
      settings({
        pendingSetup: {
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUri: 'otpauth://totp/FleetAi:jo@example.com?secret=JBSWY3DPEHPK3PXP',
          qrCodeDataUri: 'data:image/svg+xml;base64,PHN2Zy8+',
        },
      })
    )

    expect(w.find('[data-testid="two-factor-qr"]').attributes('src')).toBe(
      'data:image/svg+xml;base64,PHN2Zy8+'
    )
    expect(w.find('[data-testid="two-factor-secret"]').text()).toBe('JBSWY3DPEHPK3PXP')
    expect(forms(w)).toEqual(['post /settings/two-factor/confirm'])
    expect(w.find('input[name="code"]').exists()).toBe(true)

    const cancel = w
      .findAll('button')
      .find((b) => b.text() === 'settings.security.twoFactor.setup.cancel')
    await cancel!.trigger('click')
    expect(routerSpies.delete).toHaveBeenCalledWith('/settings/two-factor/setup', {
      preserveScroll: true,
    })
    w.unmount()
  })

  test('when enabled, offers regeneration and disabling (password + code)', () => {
    const w = mountCard(settings({ enabled: true, recoveryCodesRemaining: 5 }))

    expect(w.text()).toContain('settings.security.twoFactor.statusOn')
    expect(forms(w)).toEqual([
      'post /settings/two-factor/recovery-codes',
      'delete /settings/two-factor',
    ])
    const disableForm = w.findAll('form')[1]
    expect(disableForm.findAll('input').map((i) => i.attributes('name'))).toEqual([
      'password',
      'code',
    ])
    expect(w.find('[data-testid="two-factor-qr"]').exists()).toBe(false)
    w.unmount()
  })

  test('shows freshly generated recovery codes once', () => {
    const codes = ['abcde-fghjk', 'mnpqr-stuvw']
    const w = mountCard(settings({ enabled: true, recoveryCodes: codes }))

    const items = w.findAll('[data-testid="two-factor-recovery-codes"] li').map((li) => li.text())
    expect(items).toEqual(codes)
    w.unmount()
  })

  test('warns when the organization requires 2FA', () => {
    const w = mountCard(settings({ requiredByOrganization: true }))
    expect(w.find('[data-testid="two-factor-required"]').text()).toContain(
      'settings.security.twoFactor.requiredNow'
    )
    w.unmount()

    const enabled = mountCard(settings({ requiredByOrganization: true, enabled: true }))
    expect(enabled.find('[data-testid="two-factor-required"]').exists()).toBe(false)
    enabled.unmount()
  })
})

describe('TwoFactorPolicyCard', () => {
  const policy: OrganizationTwoFactorPolicy = {
    requireTwoFactor: true,
    graceEndsAt: '2026-10-08T10:00:00.000Z',
    membersWithoutTwoFactor: 3,
  }

  test('an admin gets the policy form with the grace period', () => {
    const w = mountWithStubs(TwoFactorPolicyCard, {
      props: { policy, canManage: true } as Record<string, unknown>,
    })

    expect(w.find('form').attributes('data-url')).toBe('/settings/org/two-factor')
    expect(w.find('form').attributes('data-method')).toBe('put')
    expect(w.find('input[name="requireTwoFactor"]').exists()).toBe(true)
    expect(w.find('input[name="graceDays"]').exists()).toBe(true)
    expect(w.find('[data-testid="two-factor-policy-missing"]').exists()).toBe(true)
    w.unmount()
  })

  test('other roles read the policy without a form', () => {
    const w = mountWithStubs(TwoFactorPolicyCard, {
      props: { policy, canManage: false } as Record<string, unknown>,
    })

    expect(w.find('form').exists()).toBe(false)
    expect(w.text()).toContain('settings.org.twoFactor.on')
    expect(w.text()).toContain('settings.org.readOnlyHint')
    w.unmount()
  })
})

describe('auth/two_factor_challenge page', () => {
  test('posts a single code field to login.two_factor.store', () => {
    const w = mountWithStubs(TwoFactorChallenge)

    expect(w.find('form').attributes('data-url')).toBe('login.two_factor.store')
    expect(w.findAll('input').map((i) => i.attributes('name'))).toEqual(['code'])
    expect(w.find('a[href="/login"]').exists()).toBe(true)
    w.unmount()
  })
})
