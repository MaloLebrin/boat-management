import { beforeEach, describe, expect, test, vi } from 'vitest'
import DocumentList from '../../inertia/components/media/DocumentList.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

// `Form` appelle `useTuyau()` : doublon qui expose l'action pour l'assertion.
vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: ['action'],
    template: '<form :data-action="JSON.stringify(action)"><slot :processing="false" /></form>',
  },
}))

const labels = {
  title: 'Documents',
  add: '+ Add documents',
  empty: 'No document yet.',
  formats: 'PDF, XLSX · 20 MB max',
  delete: 'Delete the document',
  download: 'Download',
}

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

const urls = {
  downloadUrlFor: (doc: { id: number }) => `/clients/3/media/${doc.id}/download`,
  deleteUrlFor: (doc: { id: number }) => `/clients/3/media/${doc.id}`,
}

// L'app est rendue en `en` ici : les unités de taille doivent l'être aussi.
// Elles passaient en dur en français, la liste affichait « 3.0 Mo ».
const UNIT_LABELS = { 'common.units.bytes': 'B', 'common.units.kb': 'KB', 'common.units.mb': 'MB' }

function mountList(props: Record<string, unknown> = {}) {
  return mountWithStubs(DocumentList, {
    props: { documents: [], canManage: true, labels, ...urls, ...props },
    pageProps: { appT: UNIT_LABELS },
  })
}

describe('DocumentList', () => {
  beforeEach(() => vi.clearAllMocks())

  test('shows the empty state with the formats hint and an add button', async () => {
    const wrapper = mountList()

    expect(wrapper.text()).toContain('No document yet.')
    expect(wrapper.text()).toContain('PDF, XLSX · 20 MB max')
    const addButtons = wrapper.findAll('button').filter((b) => b.text() === '+ Add documents')
    expect(addButtons).toHaveLength(2)

    await addButtons[1].trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  test('dense mode keeps a single add button in the header', () => {
    const wrapper = mountList({ dense: true })

    expect(wrapper.findAll('button').filter((b) => b.text() === '+ Add documents')).toHaveLength(1)
  })

  test('lists documents sorted by position with caption, format, size and download link', () => {
    const wrapper = mountList({
      documents: [
        makeDoc({ id: 9, position: 1, caption: 'Second' }),
        makeDoc({ id: 7, position: 0, caption: 'First', bytes: 3 * 1024 * 1024 }),
      ],
    })

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('First')
    expect(items[0].text()).toContain('PDF · 3.0 MB')
    expect(items[0].find('a').attributes('href')).toBe('/clients/3/media/7/download')
    expect(items[0].find('a').attributes('title')).toBe('Download')
    expect(items[1].text()).toContain('Second')
  })

  test('falls back to the original filename when there is no caption', () => {
    const wrapper = mountList({ documents: [makeDoc({ caption: null })] })

    expect(wrapper.text()).toContain('permit.pdf')
  })

  test('without deleteConfirm, deletion is an inline Inertia form on the delete URL', () => {
    const wrapper = mountList({ documents: [makeDoc()] })

    const form = wrapper.find('form')
    expect(JSON.parse(form.attributes('data-action')!)).toEqual({
      url: '/clients/3/media/7',
      method: 'delete',
    })
    expect(form.find('button[type="submit"]').attributes('title')).toBe('Delete the document')
    expect(wrapper.find('[data-base-confirm-modal]').exists()).toBe(false)
  })

  test('with deleteConfirm, deletion asks for confirmation before router.delete', async () => {
    const wrapper = mountList({
      documents: [makeDoc()],
      deleteConfirm: { title: 'Delete?', message: 'Irreversible.', confirmLabel: 'Delete' },
    })

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-base-confirm-modal]').exists()).toBe(false)

    await wrapper.find('button[title="Delete the document"]').trigger('click')
    expect(wrapper.find('[data-base-confirm-modal]').text()).toContain('Delete?')
    expect(routerSpies.delete).not.toHaveBeenCalled()

    await wrapper.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith('/clients/3/media/7', { preserveScroll: true })
    expect(wrapper.find('[data-base-confirm-modal]').exists()).toBe(false)
  })

  test('cancelling the confirmation deletes nothing', async () => {
    const wrapper = mountList({
      documents: [makeDoc()],
      deleteConfirm: { title: 'Delete?', message: 'Irreversible.', confirmLabel: 'Delete' },
    })

    await wrapper.find('button[title="Delete the document"]').trigger('click')
    await wrapper.find('[data-cancel]').trigger('click')

    expect(routerSpies.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[data-base-confirm-modal]').exists()).toBe(false)
  })

  test('hides every management control when canManage is false', () => {
    const wrapper = mountList({
      documents: [makeDoc()],
      canManage: false,
      deleteConfirm: { title: 'Delete?', message: 'Irreversible.', confirmLabel: 'Delete' },
    })

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
