import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, type MaybeRefOrGetter } from 'vue'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k }),
}))

import { useMineAllScope, type MineAllScope } from '../../inertia/composables/use_mine_all_scope'

const KEYS = { mine: 'dashboard.mechanic.scope.mine', all: 'dashboard.mechanic.scope.all' }

function mountScope(initial: MaybeRefOrGetter<MineAllScope>) {
  let result: ReturnType<typeof useMineAllScope> | undefined

  mount(
    defineComponent({
      setup() {
        result = useMineAllScope(initial, KEYS)
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('starts on the initial value', () => {
  expect(mountScope('mine').scope.value).toBe('mine')
  expect(mountScope('all').scope.value).toBe('all')
})

test('scopeOptions translate the given i18n keys, mine first', () => {
  const { scopeOptions } = mountScope('all')
  expect(scopeOptions.value).toEqual([
    { value: 'mine', label: KEYS.mine },
    { value: 'all', label: KEYS.all },
  ])
})

test('setScope coerces anything other than mine to all', () => {
  const { scope, setScope } = mountScope('all')
  setScope('mine')
  expect(scope.value).toBe('mine')
  setScope('unassigned')
  expect(scope.value).toBe('all')
  setScope('mine')
  setScope(undefined)
  expect(scope.value).toBe('all')
})

test('a reactive initial value realigns the scope when it changes', async () => {
  const hasMine = ref(false)
  const { scope } = mountScope(() => (hasMine.value ? 'mine' : 'all'))
  expect(scope.value).toBe('all')

  hasMine.value = true
  await nextTick()
  expect(scope.value).toBe('mine')
})

test('a manual choice sticks while the initial value does not change', async () => {
  const initial = ref<MineAllScope>('mine')
  const { scope, setScope } = mountScope(initial)
  setScope('all')
  await nextTick()
  expect(scope.value).toBe('all')
})
