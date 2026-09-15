import { mount } from '@vue/test-utils'
import { beforeEach, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

const mockPost = vi.fn()
let mockForm: Record<string, unknown> & { errors: Record<string, string> }

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    mockForm = reactive({
      ...initial,
      processing: false,
      errors: {},
      post: mockPost,
      reset: (field: string) => {
        mockForm[field] = ''
      },
    }) as typeof mockForm
    return mockForm
  },
}))

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))

import MaintenanceTaskQuickAdd from '../../inertia/components/boats/maintenance/MaintenanceTaskQuickAdd.vue'

beforeEach(() => mockPost.mockReset())

test('Enter posts the title with the equipment link, then clears the input', async () => {
  const w = mount(MaintenanceTaskQuickAdd, {
    props: { boatId: 7, equipment: { type: 'safety', id: 30 } },
  })

  await w.find('input[name="title"]').setValue('Check flares')
  await w.find('form').trigger('submit')

  expect(mockPost).toHaveBeenCalledTimes(1)
  const [url, options] = mockPost.mock.calls[0]
  expect(url).toBe('/boats/7/maintenance-tasks')
  expect(mockForm.title).toBe('Check flares')
  expect(mockForm.boatSafetyEquipmentId).toBe('30')
  expect(options.preserveScroll).toBe(true)

  options.onSuccess()
  expect(mockForm.title).toBe('')
})

test('without equipment only the title is sent', async () => {
  mount(MaintenanceTaskQuickAdd, { props: { boatId: 7 } })

  expect(Object.keys(mockForm)).not.toContain('boatEngineId')
  expect(Object.keys(mockForm)).toContain('title')
})

test('a blank title is ignored', async () => {
  const w = mount(MaintenanceTaskQuickAdd, { props: { boatId: 7 } })

  await w.find('input[name="title"]').setValue('   ')
  await w.find('form').trigger('submit')

  expect(mockPost).not.toHaveBeenCalled()
})
