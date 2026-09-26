import { renderToString } from '@vue/server-renderer'
import { afterEach, expect, test, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import BaseModal from '../../inertia/components/base/BaseModal.vue'

/**
 * Le SSR d'Inertia n'injecte que le HTML du conteneur `#app` : le contenu
 * d'un `<Teleport to="body">` rendu côté serveur est perdu. À l'hydratation,
 * Vue cherchait alors ce contenu directement dans `<body>` et tombait sur du
 * texte étranger → « Hydration node mismatch » sur chaque page portant une
 * modale (#835). Ce test rejoue le cycle SSR → hydratation complet.
 */
function makeHost(open: boolean) {
  return defineComponent({
    setup() {
      const isOpen = ref(open)
      return {
        isOpen,
        render: () => h(BaseModal, { open: isOpen.value, title: 'Hydrated' }, () => 'Body'),
      }
    },
    render() {
      return this.render()
    },
  })
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

test("s'hydrate sans mismatch quand la modale est fermée au premier rendu (#835)", async () => {
  const Host = makeHost(false)
  const html = await renderToString(createSSRApp(Host))

  const container = document.createElement('div')
  container.id = 'app'
  container.innerHTML = html
  document.body.append(container)

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})

  const app = createSSRApp(Host)
  const vm = app.mount(container) as InstanceType<typeof Host>
  await nextTick()

  const logs = [...warn.mock.calls, ...error.mock.calls].flat().map(String).join('\n')
  expect(logs).not.toMatch(/Hydration/)

  // Une fois montée, la modale s'ouvre bien dans <body>, hors du conteneur Inertia.
  vm.isOpen = true
  await nextTick()
  const dialog = document.body.querySelector('[role="dialog"]')
  expect(dialog).not.toBeNull()
  expect(container.contains(dialog)).toBe(false)
  expect(dialog?.textContent).toContain('Body')

  app.unmount()
})
