import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ImportPreviewPanel from '../../inertia/components/settings/import/ImportPreviewPanel.vue'
import type { CsvImportPreviewData, CsvPreviewRow } from '../../shared/types/csv'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

const routerPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

function row(line: number, status: CsvPreviewRow['status'], raw: Record<string, string>) {
  return { line, status, raw, errors: [] as CsvPreviewRow['errors'] }
}

function preview(overrides: Partial<CsvImportPreviewData> = {}): CsvImportPreviewData {
  return {
    type: 'expenses',
    boatId: 7,
    boatName: 'Ariane',
    totalRows: 3,
    validRows: 1,
    invalidRows: 1,
    duplicateRows: 1,
    rows: [
      row(2, 'valid', {
        date: '2026-01-15',
        label: 'Antifouling',
        amount: '350',
        category: 'maintenance',
      }),
      row(3, 'duplicate', {
        date: '2026-01-15',
        label: 'Antifouling',
        amount: '350',
        category: '',
      }),
      {
        ...row(4, 'invalid', { date: 'hier', label: '', amount: 'abc', category: '' }),
        errors: [{ column: 'label', message: 'Le libellé est obligatoire' }],
      },
    ],
    ...overrides,
  }
}

beforeEach(() => routerPost.mockClear())

/**
 * L'aperçu suit le type importé : colonnes des dépenses (libellé, montant,
 * catégorie) ou de la maintenance (titre, sujet), et un troisième statut,
 * « déjà présente », pour les lignes que la confirmation sautera.
 */
describe('ImportPreviewPanel — colonnes et statuts', () => {
  test('type expenses : colonnes dépenses, pas de sujet', () => {
    const w = mount(ImportPreviewPanel, { props: { preview: preview() } })
    const headers = w.findAll('th').map((th) => th.text())

    expect(headers).toContain('settings.import.previewColumns.label')
    expect(headers).toContain('settings.import.previewColumns.amount')
    expect(headers).toContain('settings.import.previewColumns.category')
    expect(headers).not.toContain('settings.import.previewColumns.subject')
    expect(w.text()).toContain('Antifouling')
  })

  test('type maintenance : colonnes titre et sujet', () => {
    const w = mount(ImportPreviewPanel, {
      props: {
        preview: preview({
          type: 'maintenance',
          duplicateRows: 0,
          rows: [row(2, 'valid', { date: '2026-01-15', title: 'Vidange', subject: 'engine' })],
        }),
      },
    })
    const headers = w.findAll('th').map((th) => th.text())

    expect(headers).toContain('settings.import.previewColumns.title')
    expect(headers).toContain('settings.import.previewColumns.subject')
    expect(headers).not.toContain('settings.import.previewColumns.amount')
    expect(w.find('[data-testid="preview-duplicates"]').exists()).toBe(false)
  })

  test('une ligne en doublon porte son badge et le compteur est affiché', () => {
    const w = mount(ImportPreviewPanel, { props: { preview: preview() } })

    const duplicate = w.find('tr[data-status="duplicate"]')
    expect(duplicate.exists()).toBe(true)
    expect(duplicate.text()).toContain('settings.import.rowDuplicate')
    expect(w.find('tr[data-status="invalid"]').text()).toContain('Le libellé est obligatoire')
    expect(w.find('[data-testid="preview-duplicates"]').text()).toContain(
      'settings.import.previewDuplicates'
    )
  })
})

describe('ImportPreviewPanel — confirmation', () => {
  test('confirmer envoie le type et le bateau de l’aperçu', async () => {
    const w = mount(ImportPreviewPanel, { props: { preview: preview() } })
    const buttons = w.findAll('button')
    const confirm = buttons.find((b) => b.text().includes('settings.import.confirmButton'))!

    await confirm.trigger('click')

    expect(routerPost).toHaveBeenCalledTimes(1)
    const [url, body] = routerPost.mock.calls[0] as [string, FormData]
    expect(url).toBe('/settings/import/confirm')
    expect(body.get('type')).toBe('expenses')
    expect(body.get('boatId')).toBe('7')
  })

  test('sans ligne valide, le bouton est désactivé', () => {
    const w = mount(ImportPreviewPanel, { props: { preview: preview({ validRows: 0 }) } })
    const confirm = w
      .findAll('button')
      .find((b) => b.text().includes('settings.import.confirmButton'))!

    expect(confirm.attributes('disabled')).toBeDefined()
  })
})
