import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import HomeStatValue from '../../inertia/components/marketing/home/HomeStatValue.vue'

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
  const w = mount(HomeStatValue, { props: { value: '1.5k' } })
  expect(w.vm.parsed).toMatchObject({ target: 1.5, suffix: 'k', decimals: 1 })
})

test('falls back to the raw string when no number is present', () => {
  const w = mount(HomeStatValue, { props: { value: 'N/A' } })
  expect(w.vm.parsed).toBeNull()
  expect(w.text()).toBe('N/A')
})
