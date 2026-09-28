import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'
import { useCurrentUser } from '../../inertia/composables/use_current_user'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'

function mountWithProps(props: Record<string, unknown>) {
  vi.mocked(usePage).mockReturnValue({ props } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useCurrentUser> | undefined

  mount(
    defineComponent({
      setup() {
        result = useCurrentUser()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('currentUserId reads the id of the shared user prop', () => {
  const { currentUserId } = mountWithProps({ user: { id: 42, email: 'm@example.com' } })
  expect(currentUserId.value).toBe(42)
})

test('currentUserId is null without a user prop', () => {
  const { currentUserId } = mountWithProps({})
  expect(currentUserId.value).toBeNull()
})

test('currentUserId is null when the user prop is null (guest)', () => {
  const { currentUserId } = mountWithProps({ user: null })
  expect(currentUserId.value).toBeNull()
})
