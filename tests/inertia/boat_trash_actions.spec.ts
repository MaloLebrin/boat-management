import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import BoatTrashActions from '../../inertia/components/boats/list/BoatTrashActions.vue'

const router = vi.hoisted(() => ({ delete: vi.fn() }))

vi.mock('@inertiajs/vue3', () => ({ router }))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    props: ['href', 'method'],
    template: '<a :href="href" :data-method="method"><slot /></a>',
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${Object.values(params).join(' ')}` : key,
  }),
}))

vi.mock('~/components/base/BaseConfirmModal.vue', () => ({
  default: {
    props: ['open', 'message'],
    emits: ['confirm', 'update:open'],
    template:
      '<div v-if="open" data-confirm :data-message="message"><button data-confirm-yes @click="$emit(\'confirm\')">yes</button></div>',
  },
}))

test('restore posts back to the boat and force delete asks before it purges', async () => {
  const w = mount(BoatTrashActions, { props: { boatId: 4, name: 'Hermione' } })

  const restore = w.find('a')
  expect(restore.attributes('href')).toBe('/boats/4/restore')
  expect(restore.attributes('data-method')).toBe('post')

  await w
    .findAll('button')
    .find((button) => button.text() === 'boats.trash.forceDelete')!
    .trigger('click')
  expect(w.find('[data-confirm]').attributes('data-message')).toContain('Hermione')

  await w.get('[data-confirm-yes]').trigger('click')
  expect(router.delete).toHaveBeenCalledWith('/boats/4/force', expect.any(Object))
})
