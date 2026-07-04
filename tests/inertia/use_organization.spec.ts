import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { test, expect } from 'vitest'
import { useOrganization } from '../../inertia/composables/use_organization'

function mountComposable(params: Parameters<typeof useOrganization>[0]) {
  let result: ReturnType<typeof useOrganization> | undefined

  mount(
    defineComponent({
      setup() {
        result = useOrganization(params)
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('organization returns null when given null', () => {
  const { organization } = mountComposable({ organization: null })
  expect(organization.value).toBeNull()
})

test('organization returns null when given undefined', () => {
  const { organization } = mountComposable({ organization: undefined })
  expect(organization.value).toBeNull()
})

test('organization returns the provided object', () => {
  const org = { id: 1, name: 'Sailing Club' }
  const { organization } = mountComposable({ organization: org })
  expect(organization.value).toEqual(org)
})

test('currentUserRole returns null when not provided', () => {
  const { currentUserRole } = mountComposable({ organization: null })
  expect(currentUserRole.value).toBeNull()
})

test('currentUserRole returns null when given null', () => {
  const { currentUserRole } = mountComposable({ organization: null, currentUserRole: null })
  expect(currentUserRole.value).toBeNull()
})

test('currentUserRole returns null when given undefined', () => {
  const { currentUserRole } = mountComposable({ organization: null, currentUserRole: undefined })
  expect(currentUserRole.value).toBeNull()
})

test('isAdmin is true when role is admin', () => {
  const { isAdmin } = mountComposable({ organization: null, currentUserRole: 'admin' })
  expect(isAdmin.value).toBe(true)
})

test('isAdmin is false when role is member', () => {
  const { isAdmin } = mountComposable({ organization: null, currentUserRole: 'member' })
  expect(isAdmin.value).toBe(false)
})

test('isAdmin is false when role is null', () => {
  const { isAdmin } = mountComposable({ organization: null, currentUserRole: null })
  expect(isAdmin.value).toBe(false)
})

test('isMember is true when role is member', () => {
  const { isMember } = mountComposable({ organization: null, currentUserRole: 'member' })
  expect(isMember.value).toBe(true)
})

test('isMember is false when role is admin', () => {
  const { isMember } = mountComposable({ organization: null, currentUserRole: 'admin' })
  expect(isMember.value).toBe(false)
})

test('isMember is false when role is null', () => {
  const { isMember } = mountComposable({ organization: null, currentUserRole: null })
  expect(isMember.value).toBe(false)
})

test('isAdmin and isMember are both false for null role', () => {
  const { isAdmin, isMember } = mountComposable({ organization: null, currentUserRole: null })
  expect(isAdmin.value).toBe(false)
  expect(isMember.value).toBe(false)
})

test('accepts a ref for organization', () => {
  const orgRef = ref<{ id: number; name: string } | null>({ id: 2, name: 'Test Org' })
  const { organization } = mountComposable({ organization: orgRef })
  expect(organization.value?.id).toBe(2)
})

test('accepts a getter for currentUserRole', () => {
  const { isAdmin } = mountComposable({
    organization: null,
    currentUserRole: () => 'admin' as const,
  })
  expect(isAdmin.value).toBe(true)
})
