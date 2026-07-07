import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockRouterDelete = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size'],
  },
}))

vi.mock('~/components/base/BaseConfirmModal.vue', () => ({
  default: {
    template:
      '<div v-if="open" class="confirm"><button class="do-confirm" @click="$emit(\'confirm\')" /></div>',
    props: ['open', 'title', 'message', 'confirmLabel'],
  },
}))

vi.mock('~/components/clients/ClientDocumentAddModal.vue', () => ({
  default: { template: '<div />', props: ['clientId', 'clientName', 'open'] },
}))

import ClientDocuments from '../../inertia/components/clients/ClientDocuments.vue'

function makeDoc(overrides = {}) {
  return {
    id: 7,
    kind: 'document' as const,
    secureUrl: 'https://example.com/x.pdf',
    originalFilename: 'permit.pdf',
    format: 'pdf',
    bytes: 2048,
    width: null,
    height: null,
    position: 0,
    caption: 'Permit copy',
    ...overrides,
  }
}

describe('ClientDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  test('shows empty state when no documents', () => {
    const wrapper = mount(ClientDocuments, {
      props: { clientId: 1, clientName: 'Alice', documents: [], canManage: true },
    })
    expect(wrapper.text()).toContain('clients.documents.empty')
  })

  test('lists documents with a download link', () => {
    const wrapper = mount(ClientDocuments, {
      props: { clientId: 3, clientName: 'Bob', documents: [makeDoc()], canManage: true },
    })
    expect(wrapper.text()).toContain('Permit copy')
    expect(wrapper.find('a').attributes('href')).toBe('/clients/3/media/7/download')
  })

  test('confirming deletion calls router.delete', async () => {
    const wrapper = mount(ClientDocuments, {
      props: { clientId: 3, clientName: 'Bob', documents: [makeDoc()], canManage: true },
    })
    // open confirm modal
    await wrapper.find('button[title="clients.documents.delete"]').trigger('click')
    // confirm
    await wrapper.find('.do-confirm').trigger('click')
    expect(mockRouterDelete).toHaveBeenCalledWith(
      '/clients/3/media/7',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('hides management actions when canManage is false', () => {
    const wrapper = mount(ClientDocuments, {
      props: { clientId: 3, clientName: 'Bob', documents: [makeDoc()], canManage: false },
    })
    expect(wrapper.find('button[title="clients.documents.delete"]').exists()).toBe(false)
  })
})
