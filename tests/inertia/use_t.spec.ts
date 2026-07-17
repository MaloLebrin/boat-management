import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'
import { useT } from '../../inertia/composables/use_t'

function mountWithProps(props: Record<string, unknown>) {
  vi.mocked(usePage).mockReturnValue({ props } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useT> | undefined
  mount(
    defineComponent({
      setup() {
        result = useT()
        return {}
      },
      template: '<div />',
    })
  )
  return result!
}

const appT = {
  'navigation_logs.count': '{count, plural, one {# trip} other {# trips}}',
  'greeting': 'Hello {name}',
}

const appTFr = {
  'navigation_logs.count': '{count, plural, one {# sortie} other {# sorties}}',
  'greeting': 'Bonjour {name}',
}

test('returns the key unchanged when it does not exist', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('unknown.key')).toBe('unknown.key')
})

test('interpolates simple {var} placeholders', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('greeting', { name: 'Alice' })).toBe('Hello Alice')
})

test('plural EN: singular branch for count = 1', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('navigation_logs.count', { count: 1 })).toBe('1 trip')
})

test('plural EN: other branch for count = 0', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('navigation_logs.count', { count: 0 })).toBe('0 trips')
})

test('plural EN: other branch for count > 1', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('navigation_logs.count', { count: 3 })).toBe('3 trips')
})

test('plural FR: singular branch for count = 1', () => {
  const { t } = mountWithProps({ appT: appTFr, locale: 'fr' })
  expect(t('navigation_logs.count', { count: 1 })).toBe('1 sortie')
})

test('plural FR: "one" category also covers count = 0 (CLDR fr rule)', () => {
  const { t } = mountWithProps({ appT: appTFr, locale: 'fr' })
  expect(t('navigation_logs.count', { count: 0 })).toBe('0 sortie')
})

test('plural FR: other branch for count > 1', () => {
  const { t } = mountWithProps({ appT: appTFr, locale: 'fr' })
  expect(t('navigation_logs.count', { count: 5 })).toBe('5 sorties')
})

test('plural key is returned raw when called without vars', () => {
  const { t } = mountWithProps({ appT, locale: 'en' })
  expect(t('navigation_logs.count')).toBe('{count, plural, one {# trip} other {# trips}}')
})

test('locale defaults to "en" when absent from page props', () => {
  const { locale } = mountWithProps({ appT })
  expect(locale.value).toBe('en')
})
