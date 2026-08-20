import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import HomeStatValue from '../../inertia/components/marketing/home/HomeStatValue.vue'

const page = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: page.locale } }) }
})

// `prefers-reduced-motion` fait afficher la valeur finale sans passer par
// l'animation rAF — c'est ce rendu figé que les assertions de format lisent.
beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})

afterEach(() => {
  page.locale = 'fr'
  vi.restoreAllMocks()
})

async function renderSettled(value: string) {
  const w = mount(HomeStatValue, { props: { value } })
  await nextTick()
  return w
}

// Le rendu final est animé (IntersectionObserver + rAF) ; on teste ici la
// logique déterministe : le découpage préfixe / nombre / suffixe de la valeur.

test('parses a percentage value', () => {
  const w = mount(HomeStatValue, { props: { value: '98%' } })
  expect(w.vm.parsed).toMatchObject({ prefix: '', target: 98, suffix: '%', decimals: 0 })
})

test('parses a trailing-plus value', () => {
  const w = mount(HomeStatValue, { props: { value: '2500+' } })
  expect(w.vm.parsed).toMatchObject({ prefix: '', target: 2500, suffix: '+' })
})

test('parses a leading-symbol value', () => {
  const w = mount(HomeStatValue, { props: { value: '×3' } })
  expect(w.vm.parsed).toMatchObject({ prefix: '×', target: 3, suffix: '' })
})

test('parses decimals and keeps their count', () => {
  page.locale = 'en'
  const w = mount(HomeStatValue, { props: { value: '1.5k' } })
  expect(w.vm.parsed).toMatchObject({ target: 1.5, suffix: 'k', decimals: 1 })
})

test('falls back to the raw string when no number is present', () => {
  const w = mount(HomeStatValue, { props: { value: 'N/A' } })
  expect(w.vm.parsed).toBeNull()
  expect(w.text()).toBe('N/A')
})

// #465 — le compteur passait par `toFixed()`, qui ravale le séparateur de
// milliers : « 28 240 événements » s'affichait « 28240 ».
test('reads a French thousands separator and renders it back', async () => {
  const w = await renderSettled('28 240')
  expect(w.vm.parsed).toMatchObject({ target: 28240, decimals: 0 })
  expect(w.text()).not.toBe('28240')
  expect(w.text().replace(/\s/g, ' ')).toBe('28 240')
})

test('reads an English thousands separator and renders it back', async () => {
  page.locale = 'en'
  const w = await renderSettled('28,240')
  expect(w.vm.parsed).toMatchObject({ target: 28240, decimals: 0 })
  expect(w.text()).toBe('28,240')
})

// En français la virgule est décimale : la traiter comme un séparateur de
// milliers transformerait « 1,2 M€ » en « 12 M€ ».
test('reads a French decimal comma as a decimal separator', async () => {
  const w = await renderSettled('1,2 M€')
  expect(w.vm.parsed).toMatchObject({ target: 1.2, suffix: ' M€', decimals: 1 })
  expect(w.text().replace(/\s/g, ' ')).toBe('1,2 M€')
})
