import { mount } from '@vue/test-utils'
import { afterEach, test, expect } from 'vitest'
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
