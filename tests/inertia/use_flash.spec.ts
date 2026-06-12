import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'
import { useFlash } from '../../inertia/composables/use_flash'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'

function mountWithFlash(flash: { success?: string; error?: string }) {
  vi.mocked(usePage).mockReturnValue({ props: { flash } } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useFlash> | undefined

  mount(
    defineComponent({
      setup() {
        result = useFlash()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('successMessage returns success string from flash props', () => {
  const { successMessage } = mountWithFlash({ success: 'Saved!', error: undefined })
  expect(successMessage.value).toBe('Saved!')
})

test('errorMessage returns error string from flash props', () => {
  const { errorMessage } = mountWithFlash({ error: 'Something went wrong', success: undefined })
  expect(errorMessage.value).toBe('Something went wrong')
})

test('successMessage is null when flash has no success key', () => {
  const { successMessage } = mountWithFlash({})
  expect(successMessage.value).toBeNull()
})

test('errorMessage is null when flash has no error key', () => {
  const { errorMessage } = mountWithFlash({})
  expect(errorMessage.value).toBeNull()
})

test('both messages can be non-null simultaneously', () => {
  const { successMessage, errorMessage } = mountWithFlash({
    success: 'Done',
    error: 'But also this',
  })
  expect(successMessage.value).toBe('Done')
  expect(errorMessage.value).toBe('But also this')
})
