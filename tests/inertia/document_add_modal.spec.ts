import { beforeEach, describe, expect, test, vi } from 'vitest'
import DocumentAddModal from '../../inertia/components/media/DocumentAddModal.vue'
import { forms, formSpies, mountWithStubs } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

const labels = {
  dropzone: 'Drop files here',
  formats: 'PDF, XLSX',
  browse: 'Browse',
  selectedFiles: 'Selected files',
  caption: 'Caption',
  upload: 'Upload',
  uploading: 'Uploading…',
}

const baseProps = {
  open: true,
  uploadUrl: '/boats/5/documents',
  title: 'Add a document',
  subtitle: 'Mistral',
  labels,
}

// Rendue en `en` : les unités de taille viennent de `common.units.*`, elles ne
// sont plus figées en français.
const UNIT_LABELS = { 'common.units.bytes': 'B', 'common.units.kb': 'KB', 'common.units.mb': 'MB' }

function mountModal(props: Record<string, unknown> = {}) {
  return mountWithStubs(DocumentAddModal, {
    props: { ...baseProps, ...props },
    pageProps: { appT: UNIT_LABELS },
  })
}

function fileInput(wrapper: ReturnType<typeof mountModal>) {
  return wrapper.find('input[type="file"]')
}

describe('DocumentAddModal', () => {
  beforeEach(() => vi.clearAllMocks())

  test('renders the labels handed over by the domain', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Drop files here')
    expect(wrapper.text()).toContain('PDF, XLSX')
    expect(wrapper.text()).toContain('Browse')
    expect(wrapper.text()).toContain('Caption')
    expect(wrapper.find('[data-base-modal] h2').text()).toBe('Add a document')
    expect(wrapper.find('[data-base-modal] p').text()).toBe('Mistral')
  })

  test('accepts multiple files at once via the file input', async () => {
    const wrapper = mountModal()
    const files = [
      new File(['a'], 'doc-1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc-2.pdf', { type: 'application/pdf' }),
    ]
    const input = fileInput(wrapper)

    expect(input.attributes('multiple')).toBeDefined()

    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')

    expect(forms[0].files).toEqual(files)
  })

  test('lists the selected files with their size and allows removing one', async () => {
    const wrapper = mountModal()
    const files = [
      new File(['a'], 'doc-1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc-2.pdf', { type: 'application/pdf' }),
    ]
    const input = fileInput(wrapper)
    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Selected files')
    expect(wrapper.text()).toContain('doc-1.pdf · 1 B')
    expect(wrapper.text()).toContain('doc-2.pdf')

    await wrapper.findAll('li button')[0].trigger('click')

    expect(forms[0].files).toEqual([files[1]])
  })

  test('does not submit when no file is selected', () => {
    const wrapper = mountModal()
    const submitButton = wrapper.findAll('button').find((b) => b.text() === 'Upload')

    expect(submitButton?.attributes('disabled')).toBeDefined()
  })

  test('submits all selected files in one request to the domain URL', async () => {
    const wrapper = mountModal()
    forms[0].files = [new File(['a'], 'doc-1.pdf', { type: 'application/pdf' })]
    await wrapper.vm.$nextTick()

    const submitButton = wrapper.findAll('button').find((b) => b.text() === 'Upload')
    await submitButton!.trigger('click')

    expect(formSpies.post).toHaveBeenCalledTimes(1)
    expect(formSpies.post).toHaveBeenCalledWith(
      '/boats/5/documents',
      expect.objectContaining({ forceFormData: true })
    )
    expect(formSpies.post.mock.calls[0][1]).not.toHaveProperty('preserveScroll')
  })

  test('keeps the scroll position on submit when asked', async () => {
    const wrapper = mountModal({ preserveScroll: true, uploadUrl: '/clients/3/documents' })
    forms[0].files = [new File(['a'], 'doc-1.pdf', { type: 'application/pdf' })]
    await wrapper.vm.$nextTick()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Upload')!
      .trigger('click')

    expect(formSpies.post).toHaveBeenCalledWith(
      '/clients/3/documents',
      expect.objectContaining({ forceFormData: true, preserveScroll: true })
    )
  })

  test('shows the uploading label while the form is processing', async () => {
    const wrapper = mountModal()
    forms[0].processing = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Uploading…')
  })

  test('closing resets the form and emits update:open', async () => {
    const wrapper = mountModal()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'common.cancel')!
      .trigger('click')

    expect(formSpies.reset).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  test('uses the close label handed over by the domain, common.close otherwise', () => {
    expect(mountModal().findComponent({ name: 'BaseModal' }).props('closeLabel')).toBe(
      'common.close'
    )
    expect(
      mountModal({ closeLabel: 'common.cancel' })
        .findComponent({ name: 'BaseModal' })
        .props('closeLabel')
    ).toBe('common.cancel')
  })
})
