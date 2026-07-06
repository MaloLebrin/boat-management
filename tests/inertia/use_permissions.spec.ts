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
import { usePermissions } from '../../inertia/composables/use_permissions'

function mountWithPermissions(permissions: unknown) {
  vi.mocked(usePage).mockReturnValue({
    props: { permissions },
  } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof usePermissions> | undefined

  mount(
    defineComponent({
      setup() {
        result = usePermissions()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('admin role: isAdmin true, isMember false', () => {
  const { role, isAdmin, isMember } = mountWithPermissions({
    role: 'admin',
    capabilities: ['boats.view', 'boats.delete'],
  })
  expect(role.value).toBe('admin')
  expect(isAdmin.value).toBe(true)
  expect(isMember.value).toBe(false)
})

test('member role: isMember true, isAdmin false', () => {
  const { role, isAdmin, isMember } = mountWithPermissions({
    role: 'member',
    capabilities: ['boats.view'],
  })
  expect(role.value).toBe('member')
  expect(isAdmin.value).toBe(false)
  expect(isMember.value).toBe(true)
})

test('can() returns true only for granted capabilities', () => {
  const { can } = mountWithPermissions({
    role: 'member',
    capabilities: ['boats.view', 'boats.create'],
  })
  expect(can('boats.view')).toBe(true)
  expect(can('boats.delete')).toBe(false)
})

test('missing permissions prop: role null, can() always false', () => {
  const { role, isAdmin, isMember, can } = mountWithPermissions(undefined)
  expect(role.value).toBeNull()
  expect(isAdmin.value).toBe(false)
  expect(isMember.value).toBe(false)
  expect(can('boats.view')).toBe(false)
})

test('null role with empty capabilities', () => {
  const { role, can } = mountWithPermissions({ role: null, capabilities: [] })
  expect(role.value).toBeNull()
  expect(can('boats.view')).toBe(false)
})
