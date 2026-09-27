import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import BaseModal from '../../inertia/components/base/BaseModal.vue'

afterEach(() => {
  document.body.style.overflow = ''
})

test('renders content when open', () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Modal' },
    slots: { default: 'Body' },
    global: { stubs: { teleport: true } },
  })
  expect(w.text()).toContain('Modal')
  expect(w.text()).toContain('Body')
})

test('locks body scroll while open and releases it on close', async () => {
  const w = mount(BaseModal, {
    props: { open: false },
    global: { stubs: { teleport: true } },
  })
  await w.setProps({ open: true })
  expect(document.body.style.overflow).toBe('hidden')

  await w.setProps({ open: false })
  expect(document.body.style.overflow).toBe('')
})

test('releases body scroll when unmounted while still open (#358)', () => {
  const w = mount(BaseModal, {
    props: { open: true },
    global: { stubs: { teleport: true } },
  })
  expect(document.body.style.overflow).toBe('hidden')

  w.unmount()
  expect(document.body.style.overflow).toBe('')
})

test('nomme le dialogue par son titre (#734)', () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Conflict detected' },
    global: { stubs: { teleport: true } },
  })
  const dialog = w.get('[role="dialog"]')
  expect(dialog.attributes('aria-modal')).toBe('true')
  const labelledBy = dialog.attributes('aria-labelledby')
  expect(w.get(`#${labelledBy}`).text()).toBe('Conflict detected')
})

test('sans titre, garde un nom accessible de repli', () => {
  const w = mount(BaseModal, {
    props: { open: true },
    global: { stubs: { teleport: true } },
  })
  const dialog = w.get('[role="dialog"]')
  expect(dialog.attributes('aria-label')).toBe('Modal')
  expect(dialog.attributes('aria-labelledby')).toBeUndefined()
})

test('dismissible: false ferme toute sortie neutre (#734)', async () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Blocking', dismissible: false },
    global: { stubs: { teleport: true } },
  })

  // Pas de croix dans l'en-tête…
  expect(w.findAll('button')).toHaveLength(0)

  // …ni fermeture au clic sur l'arrière-plan…
  await w.get('.fixed.inset-0.z-50').trigger('click')
  expect(w.emitted('update:open')).toBeUndefined()

  // …ni à la touche Échap.
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await w.vm.$nextTick()
  expect(w.emitted('update:open')).toBeUndefined()
})

test('une modale ordinaire reste fermable au clic sur l’arrière-plan et à Échap', async () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Ordinary' },
    global: { stubs: { teleport: true } },
  })

  await w.get('.fixed.inset-0.z-50').trigger('click')
  expect(w.emitted('update:open')).toEqual([[false]])

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await w.vm.$nextTick()
  expect(w.emitted('update:open')).toEqual([[false], [false]])
})

describe('gestion du focus (#861)', () => {
  let trigger: HTMLButtonElement

  beforeEach(() => {
    trigger = document.createElement('button')
    trigger.textContent = 'Ouvrir'
    document.body.appendChild(trigger)
    trigger.focus()
  })

  afterEach(() => {
    trigger.remove()
  })

  function mountForm(props: Record<string, unknown> = {}) {
    return mount(BaseModal, {
      props: { open: false, title: 'Nouveau client', ...props },
      slots: {
        default: '<input id="name" /><input id="email" />',
        footer: '<button id="save" type="button">Enregistrer</button>',
      },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })
  }

  async function open(w: ReturnType<typeof mountForm>) {
    await w.setProps({ open: true })
    await flushPromises()
  }

  test('à l’ouverture, le focus va au premier champ du corps plutôt qu’au bouton Fermer', async () => {
    const w = mountForm()
    await open(w)

    expect(document.activeElement?.id).toBe('name')
    w.unmount()
  })

  test('initialFocus cible un élément précis', async () => {
    const w = mountForm({ initialFocus: '#email' })
    await open(w)

    expect(document.activeElement?.id).toBe('email')
    w.unmount()
  })

  test('Tab depuis le dernier élément revient au premier, Maj+Tab fait l’inverse', async () => {
    const w = mountForm()
    await open(w)
    const dialog = w.get('[role="dialog"]').element as HTMLElement
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('button, input'))
    const first = items[0]
    const last = items.at(-1)!
    expect(first.textContent).toBe('Close')
    expect(last.id).toBe('save')

    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(first)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    )
    expect(document.activeElement).toBe(last)
    w.unmount()
  })

  test('un focus qui sort du dialogue y est ramené', async () => {
    const w = mountForm()
    await open(w)

    trigger.focus()
    expect(document.activeElement?.id).toBe('name')
    w.unmount()
  })

  test('à la fermeture, le focus revient au déclencheur', async () => {
    const w = mountForm()
    await open(w)
    expect(document.activeElement).not.toBe(trigger)

    await w.setProps({ open: false })
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
    w.unmount()
  })

  test('sans élément focalisable, le dialogue lui-même reçoit le focus', async () => {
    const w = mount(BaseModal, {
      props: { open: false, dismissible: false },
      slots: { default: 'Traitement en cours…' },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })
    await w.setProps({ open: true })
    await flushPromises()

    expect(document.activeElement).toBe(w.get('[role="dialog"]').element)
    w.unmount()
  })

  test('deux modales empilées : Échap et le piège ne concernent que la dernière', async () => {
    const parent = mountForm()
    await open(parent)
    const child = mount(BaseModal, {
      props: { open: false, title: 'Confirmer' },
      slots: { default: '<button id="confirm" type="button">OK</button>' },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })
    await child.setProps({ open: true })
    await flushPromises()
    expect(document.activeElement?.id).toBe('confirm')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(child.emitted('update:open')).toEqual([[false]])
    expect(parent.emitted('update:open')).toBeUndefined()

    await child.setProps({ open: false })
    await flushPromises()
    expect(document.activeElement?.id).toBe('name')

    child.unmount()
    parent.unmount()
  })
})
