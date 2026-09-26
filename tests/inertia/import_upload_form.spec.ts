import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ImportUploadForm from '../../inertia/components/settings/import/ImportUploadForm.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

const routerPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

const boatOptions = [
  { value: '1', label: 'Ariane' },
  { value: '2', label: 'Pen Duick' },
]

function mountForm(props: Partial<InstanceType<typeof ImportUploadForm>['$props']> = {}) {
  return mount(ImportUploadForm, {
    props: {
      boatOptions,
      singleBoatId: null,
      boatId: '1',
      type: 'maintenance',
      ...props,
    },
  })
}

beforeEach(() => routerPost.mockClear())

describe('ImportUploadForm — fichier CSV ou Excel', () => {
  test('l’input accepte .csv et .xlsx', () => {
    const w = mountForm()
    expect(w.find('input[type="file"]').attributes('accept')).toBe('.csv,.xlsx')
    expect(w.text()).toContain('settings.import.fileLabel')
  })

  test('les en-têtes modèles suivent le type', () => {
    expect(mountForm({ type: 'maintenance' }).text()).toContain('settings.import.templateHint')
    const expenses = mountForm({ type: 'expenses' })
    expect(expenses.findAll('select').at(-1)!.element.value).toBe('expenses')
  })

  test('le sélecteur propose les deux types et émet le changement', async () => {
    const w = mountForm()
    const typeSelect = w.findAll('select').at(-1)!
    const values = typeSelect.findAll('option').map((o) => o.attributes('value'))

    expect(values).toContain('maintenance')
    expect(values).toContain('expenses')

    await typeSelect.setValue('expenses')
    expect(w.emitted('update:type')?.at(-1)).toEqual(['expenses'])
  })
})

describe('ImportUploadForm — prévisualisation', () => {
  test('sans bateau, le bouton est désactivé et rien n’est envoyé', async () => {
    const w = mountForm({ boatId: '' })
    const button = w.find('button[type="button"]')

    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    expect(routerPost).not.toHaveBeenCalled()
  })

  test('avec un fichier, envoie type, bateau et fichier en FormData', async () => {
    const w = mountForm({ type: 'expenses', boatId: '2' })
    const input = w.find('input[type="file"]')
    const file = new File(['date;label;amount'], 'depenses.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', { value: [file] })

    await w.find('button[type="button"]').trigger('click')

    expect(routerPost).toHaveBeenCalledTimes(1)
    const [url, body] = routerPost.mock.calls[0] as [string, FormData]
    expect(url).toBe('/settings/import/preview')
    expect(body.get('type')).toBe('expenses')
    expect(body.get('boatId')).toBe('2')
    expect(body.get('file')).toBe(file)
  })
})
