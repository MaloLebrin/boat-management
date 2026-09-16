import { vi } from 'vitest'
import { reactive } from 'vue'

/**
 * Doublon partagé de `@inertiajs/vue3` pour les specs Vitest.
 *
 * À poser en tête de spec (la factory est hoistée, d'où l'import dynamique) :
 *
 * ```ts
 * vi.mock('@inertiajs/vue3', async () => {
 *   const { inertiaMock } = await import('./helpers/inertia_mock')
 *   return inertiaMock()
 * })
 * ```
 *
 * Tout ce que le composant monté appelle est ensuite observable depuis le
 * test : `routerSpies.post`, `formSpies.put`, `forms.at(-1)` (dernier
 * `useForm()` créé), `pageState.props` (ce que `usePage()` rend). Le vrai
 * `useT()` fonctionne par-dessus : `appT` vide → `t(clé)` renvoie la clé.
 */

export const routerSpies = {
  visit: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
  remember: vi.fn(),
  restore: vi.fn(),
  on: vi.fn(() => () => {}),
}

export const formSpies = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
  clearErrors: vi.fn(),
  setError: vi.fn(),
  cancel: vi.fn(),
}

export interface FakePage {
  props: Record<string, unknown>
  url: string
  component: string
  version: string | null
}

export const pageState: FakePage = reactive({
  props: { appT: {}, locale: 'en' },
  url: '/',
  component: '',
  version: null,
})

export type FakeForm = Record<string, unknown> & {
  errors: Record<string, string>
  processing: boolean
  hasErrors: boolean
  isDirty: boolean
  wasSuccessful: boolean
  recentlySuccessful: boolean
  data(): Record<string, unknown>
} & typeof formSpies

/** Chaque `useForm()` créé depuis le dernier `resetInertiaMock()`, dans l'ordre. */
export const forms: FakeForm[] = []

function fakeUseForm(...args: unknown[]): FakeForm {
  // Signature `useForm(rememberKey, data)` ou `useForm(data)`.
  const initial = (typeof args[0] === 'string' ? args[1] : args[0]) as Record<string, unknown>
  const keys = Object.keys(initial ?? {})
  const form = reactive({
    ...initial,
    errors: {},
    processing: false,
    hasErrors: false,
    isDirty: false,
    wasSuccessful: false,
    recentlySuccessful: false,
    ...formSpies,
    data: () => Object.fromEntries(keys.map((key) => [key, form[key]])),
    transform: () => form,
    defaults: () => form,
  }) as FakeForm
  forms.push(form)
  return form
}

export function inertiaMock() {
  return {
    usePage: () => pageState,
    router: routerSpies,
    useForm: fakeUseForm,
    Head: {
      name: 'Head',
      props: ['title'],
      template: '<div data-inertia-head><slot /></div>',
    },
    Link: {
      name: 'Link',
      props: ['href', 'method', 'as', 'data', 'preserveScroll', 'preserveState', 'replace'],
      template: '<a :href="href"><slot /></a>',
    },
  }
}

export interface ResetInertiaMockOptions {
  /** Props partagées supplémentaires (`currentPlan`, `permissions`, `flash`…). */
  props?: Record<string, unknown>
  locale?: string
}

/** Remet les espions à zéro et redéfinit les props partagées de la page. */
export function resetInertiaMock(options: ResetInertiaMockOptions = {}): void {
  pageState.props = { appT: {}, locale: options.locale ?? 'en', ...options.props }
  for (const spy of Object.values(routerSpies)) spy.mockClear()
  for (const spy of Object.values(formSpies)) spy.mockClear()
  forms.length = 0
}
