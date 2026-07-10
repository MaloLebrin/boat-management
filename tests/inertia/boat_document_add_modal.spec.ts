import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'
import BoatDocumentAddModal from '../../inertia/components/boats/show/modals/BoatDocumentAddModal.vue'

const mockFormPost = vi.fn()
// `useForm` returns a reactive object in real Inertia — mirror that here so the
// template re-renders when the component mutates `form.files` after selection.
const mockForm = reactive({
  files: [] as File[],
  caption: '',
  processing: false,
  errors: {} as Record<string, string>,
  post: mockFormPost,
  reset: vi.fn(),
})

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['open', 'title', 'subtitle', 'closeLabel', 'size'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
    emits: ['click'],
  },
}))

const baseProps = {
  boat: { id: 5, name: 'Mistral' },
  open: true,
}

function fileInput(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('input[type="file"]')
}

describe('BoatDocumentAddModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForm.files = []
    mockForm.caption = ''
    mockForm.processing = false
    mockForm.errors = {}
  })

  test('accepts multiple files at once via the file input', async () => {
    const wrapper = mount(BoatDocumentAddModal, { props: baseProps as never })
    const files = [
      new File(['a'], 'doc-1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc-2.pdf', { type: 'application/pdf' }),
    ]
    const input = fileInput(wrapper)

    expect(input.attributes('multiple')).toBeDefined()

    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')

    expect(mockForm.files).toEqual(files)
  })

  test('lists the selected files and allows removing one', async () => {
    const wrapper = mount(BoatDocumentAddModal, { props: baseProps as never })
    const files = [
      new File(['a'], 'doc-1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc-2.pdf', { type: 'application/pdf' }),
    ]
    const input = fileInput(wrapper)
    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('doc-1.pdf')
    expect(wrapper.text()).toContain('doc-2.pdf')

    const removeButtons = wrapper.findAll('li button')
    await removeButtons[0].trigger('click')

    expect(mockForm.files).toEqual([files[1]])
  })

  test('does not submit when no file is selected', async () => {
    const wrapper = mount(BoatDocumentAddModal, { props: baseProps as never })
    const submitButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'boats.show.mediaUpload.upload')

    expect(submitButton?.attributes('disabled')).toBeDefined()
  })

  test('submits all selected files in one request', async () => {
    mockForm.files = [new File(['a'], 'doc-1.pdf', { type: 'application/pdf' })]
    const wrapper = mount(BoatDocumentAddModal, { props: baseProps as never })

    const submitButton = wrapper
      .findAll('button')
      .find((b) => b.text().includes('boats.show.mediaUpload.upload'))
    await submitButton!.trigger('click')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/5/documents',
      expect.objectContaining({ forceFormData: true })
    )
  })
})
