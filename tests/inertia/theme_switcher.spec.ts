import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'

const setTheme = vi.fn()
// Un vrai `ref` : les templates déballent les refs, pas un objet `{ value }`.
const preference = ref<string>('system')

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/composables/use_theme', () => ({
  useTheme: () => ({ preference, setTheme }),
}))

const themeSwitcherModule = await import('../../inertia/components/layout/ThemeSwitcher.vue')
const themeCardModule = await import('../../inertia/components/settings/me/ThemeCard.vue')
const themeToggleModule = await import('../../inertia/components/layout/ThemeToggle.vue')
const ThemeToggle = themeToggleModule.default
const ThemeSwitcher = themeSwitcherModule.default
const ThemeCard = themeCardModule.default

beforeEach(() => {
  setTheme.mockClear()
  preference.value = 'system'
})

describe('ThemeSwitcher', () => {
  test('renders the three preferences', () => {
    const w = mount(ThemeSwitcher)
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(w.text()).toContain('common.theme.system')
    expect(w.text()).toContain('common.theme.light')
    expect(w.text()).toContain('common.theme.dark')
  })

  test('marks only the active preference with aria-pressed', () => {
    preference.value = 'dark'
    const w = mount(ThemeSwitcher)
    const pressed = w.findAll('button').map((b) => b.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'false', 'true'])
  })

  test('calls setTheme with the clicked preference', async () => {
    const w = mount(ThemeSwitcher)
    await w.findAll('button')[1].trigger('click')
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  test('uses navy classes on the always-dark sidebar', () => {
    const w = mount(ThemeSwitcher, { props: { tone: 'onDark' } })
    expect(w.findAll('button')[0].classes().join(' ')).toContain('bg-navy-500')
  })

  test('uses semantic tokens on flipping surfaces', () => {
    const w = mount(ThemeSwitcher)
    const active = w.findAll('button')[0].classes().join(' ')
    expect(active).toContain('bg-brand')
    expect(active).toContain('text-on-brand')
  })
})

describe('ThemeCard', () => {
  test('applies the theme on selection without a save step', async () => {
    const w = mount(ThemeCard)
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(3)

    await buttons[2].trigger('click')

    expect(setTheme).toHaveBeenCalledWith('dark')
    // Pas de bouton submit : le choix est persisté au clic.
    expect(w.find('button[type="submit"]').exists()).toBe(false)
  })

  test('reflects the current preference on the segmented control', () => {
    preference.value = 'light'
    const w = mount(ThemeCard)
    const pressed = w.findAll('button').map((b) => b.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'true', 'false'])
  })
})

describe('ThemeToggle (header public)', () => {
  test('rend un seul bouton, libellé par la préférence courante', () => {
    preference.value = 'dark'
    const w = mount(ThemeToggle)
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].attributes('aria-label')).toBe('common.theme.toggle · common.theme.dark')
    expect(buttons[0].attributes('data-preference')).toBe('dark')
  })

  test.each([
    ['system', 'light'],
    ['light', 'dark'],
    ['dark', 'system'],
  ])('passe de %s à %s au clic', async (current, expected) => {
    preference.value = current
    const w = mount(ThemeToggle)
    await w.get('button').trigger('click')
    expect(setTheme).toHaveBeenCalledWith(expected)
  })
})
