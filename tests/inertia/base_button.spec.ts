import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import BaseButton from '../../inertia/components/base/BaseButton.vue'

vi.mock('@adonisjs/inertia/vue', () => {
  return {
    Link: {
      name: 'MockInertiaLink',
      props: {
        href: { type: String, required: false },
        route: { type: String, required: false },
        method: { type: String, required: false },
        preserveScroll: { type: Boolean, required: false },
        preserveState: { type: Boolean, required: false },
        replace: { type: Boolean, required: false },
      },
      template: '<a data-link :href="href"><slot /></a>',
    },
  }
})

test('renders slot content', () => {
  const w = mount(BaseButton, { slots: { default: 'Submit' } })
  expect(w.text()).toContain('Submit')
})

test('applies primary variant classes by default', () => {
  const w = mount(BaseButton, { slots: { default: 'Go' } })
  expect(w.classes().join(' ')).toContain('bg-brand')
})

test('respects disabled prop', () => {
  const w = mount(BaseButton, { props: { disabled: true }, slots: { default: 'X' } })
  expect(w.attributes('disabled')).toBeDefined()
})

test('uses danger variant classes when variant is danger', () => {
  const w = mount(BaseButton, { props: { variant: 'danger' }, slots: { default: 'Del' } })
  expect(w.classes().join(' ')).toContain('bg-danger-soft')
})

test('renders as inertia Link when route is provided', () => {
  const w = mount(BaseButton, { props: { route: 'dashboard' }, slots: { default: 'Dashboard' } })
  expect(w.element.tagName.toLowerCase()).toBe('a')
  expect(w.attributes('data-link')).toBeDefined()
})

/**
 * Un `href` interne est une navigation : il doit passer par `<Link>`, sinon le
 * bouton recharge toute la page et fait perdre l'état client (#533).
 */
describe('href interne vs externe (#533)', () => {
  test('un href interne passe par le Link Inertia', () => {
    const w = mount(BaseButton, { props: { href: '/boats' }, slots: { default: 'Boats' } })
    expect(w.element.tagName.toLowerCase()).toBe('a')
    expect(w.attributes('data-link')).toBeDefined()
    expect(w.attributes('href')).toBe('/boats')
  })

  test('un href absolu reste une ancre brute', () => {
    const w = mount(BaseButton, {
      props: { href: 'https://example.org' },
      slots: { default: 'Doc' },
    })
    expect(w.element.tagName.toLowerCase()).toBe('a')
    expect(w.attributes('data-link')).toBeUndefined()
    expect(w.attributes('href')).toBe('https://example.org')
  })

  test('un mailto: reste une ancre brute', () => {
    const w = mount(BaseButton, {
      props: { href: 'mailto:support@fleetai.app' },
      slots: { default: 'Mail' },
    })
    expect(w.attributes('data-link')).toBeUndefined()
  })

  /**
   * Un téléchargement n'est pas une navigation : une visite Inertia afficherait
   * le binaire comme une page. `external-href` force l'ancre brute.
   */
  test('external-href force l’ancre brute sur un chemin interne', () => {
    const w = mount(BaseButton, {
      props: { href: '/invoices/1/pdf', externalHref: true, target: '_blank' },
      slots: { default: 'PDF' },
    })
    expect(w.attributes('data-link')).toBeUndefined()
    expect(w.attributes('href')).toBe('/invoices/1/pdf')
    expect(w.attributes('target')).toBe('_blank')
  })
})

test('prevents navigation when disabled in link mode', async () => {
  const w = mount(BaseButton, {
    props: { href: '/boats', disabled: true },
    slots: { default: 'Boats' },
  })
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  w.element.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(w.attributes('aria-disabled')).toBe('true')
})

describe('dark mode (#416)', () => {
  // `text-white` sur `bg-brand` passait sous le seuil AA une fois le brand
  // éclairci en sombre : le texte posé sur un aplat de marque doit utiliser
  // `text-on-brand`, qui bascule avec lui.
  test('la variante primary pose text-on-brand sur bg-brand, jamais text-white', () => {
    const w = mount(BaseButton, { slots: { default: 'Go' } })
    const classes = w.classes().join(' ')
    expect(classes).toContain('bg-brand')
    expect(classes).toContain('text-on-brand')
    expect(classes).not.toContain('text-white')
  })

  test('la variante danger utilise les tokens de danger, pas la palette red', () => {
    const w = mount(BaseButton, { props: { variant: 'danger' }, slots: { default: 'Del' } })
    const classes = w.classes().join(' ')
    expect(classes).toContain('bg-danger-soft')
    // `text-danger` n'atteint pas 4.5:1 sur `bg-danger-soft` : d'où le palier assombri.
    expect(classes).toContain('text-danger-strong')
    expect(classes).not.toMatch(/-red-\d/)
  })

  test('les variantes de surface s’appuient sur des tokens qui basculent', () => {
    for (const variant of ['secondary', 'outline', 'ghost'] as const) {
      const classes = mount(BaseButton, { props: { variant }, slots: { default: 'X' } })
        .classes()
        .join(' ')
      expect(classes, variant).toMatch(/\b(bg-surface|text-fg|border-border)/)
      expect(classes, variant).not.toContain('bg-white')
    }
  })
})

test('une URL protocol-relative n’est pas prise pour un chemin interne', () => {
  const w = mount(BaseButton, { props: { href: '//cdn.example.org/x' }, slots: { default: 'X' } })
  expect(w.attributes('data-link')).toBeUndefined()
})
