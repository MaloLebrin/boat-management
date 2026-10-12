import { describe, expect, test, vi } from 'vitest'
import { mountWithStubs } from './helpers/mount'

/** Désinscription en un clic d'un rapport de flotte (#871). */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    props: ['action'],
    template:
      '<form :data-url="action.url" :data-method="action.method"><slot :processing="false" /></form>',
  },
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

import DigestUnsubscribe from '../../inertia/pages/reports/digest_unsubscribe.vue'

const action = '/reports/digest/unsubscribe/token'

describe('reports/digest_unsubscribe', () => {
  test('asks first: the button posts on the signed URL', () => {
    const w = mountWithStubs(DigestUnsubscribe, { props: { kind: 'weekly', action, done: false } })
    expect(w.text()).toContain('reports.digest.unsubscribe.confirm.weekly')
    const form = w.find('form')
    expect(form.attributes('data-url')).toBe(action)
    expect(form.attributes('data-method')).toBe('post')
    expect(w.find('[data-testid="digest-unsubscribe-done"]').exists()).toBe(false)
    w.unmount()
  })

  test('once done, confirms which report stopped and drops the form', () => {
    const w = mountWithStubs(DigestUnsubscribe, { props: { kind: 'monthly', action, done: true } })
    expect(w.find('[data-testid="digest-unsubscribe-done"]').text()).toBe(
      'reports.digest.unsubscribe.done.monthly'
    )
    expect(w.find('form').exists()).toBe(false)
    expect(w.find('a').attributes('href')).toBe('/settings/notifications')
    w.unmount()
  })
})
