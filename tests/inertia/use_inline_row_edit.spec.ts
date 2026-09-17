import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import {
  useInlineRowEdit,
  type InlineEditForm,
} from '../../inertia/composables/use_inline_row_edit'

interface Row {
  id: number
  label: string
  amount: number
  note: string | null
}

interface Fields extends Record<string, string> {
  label: string
  amount: string
  note: string
}

const ROW: Row = { id: 11, label: 'Taxe', amount: 1250, note: null }
const OTHER: Row = { id: 12, label: 'Carénage', amount: 800, note: 'chantier' }

const patch = vi.fn()
const reset = vi.fn()

/** Doublon du `useForm` d'Inertia : des champs réactifs, `reset` et `patch`. */
function fakeForm(): InlineEditForm<Fields> {
  return reactive({
    label: '',
    amount: '',
    note: '',
    reset,
    patch,
  }) as unknown as InlineEditForm<Fields>
}

function setup() {
  const form = fakeForm()
  let api!: ReturnType<typeof useInlineRowEdit<Row, Fields>>
  mount(
    defineComponent({
      setup() {
        api = useInlineRowEdit<Row, Fields>({
          form,
          fill: (row) => ({
            label: row.label,
            amount: String(row.amount),
            note: row.note ?? '',
          }),
          url: (id) => `/boats/1/budget/entries/${id}`,
        })
        return () => null
      },
    })
  )
  return { api, form }
}

beforeEach(() => {
  patch.mockClear()
  reset.mockClear()
})

describe('useInlineRowEdit', () => {
  test('aucune ligne éditée au départ', () => {
    expect(setup().api.editingId.value).toBe(null)
  })

  test('`start` retient la ligne et charge le formulaire', () => {
    const { api, form } = setup()

    api.start(ROW)

    expect(api.editingId.value).toBe(11)
    expect(form.label).toBe('Taxe')
    expect(form.amount).toBe('1250')
    expect(form.note).toBe('')
  })

  test('`start` sur une autre ligne recharge le formulaire', () => {
    const { api, form } = setup()

    api.start(ROW)
    api.start(OTHER)

    expect(api.editingId.value).toBe(12)
    expect(form.note).toBe('chantier')
  })

  test('`cancel` referme et remet le formulaire à zéro', () => {
    const { api } = setup()
    api.start(ROW)

    api.cancel()

    expect(api.editingId.value).toBe(null)
    expect(reset).toHaveBeenCalledOnce()
  })

  test('`submit` patche l’URL de la ligne, défilement conservé', () => {
    const { api } = setup()
    api.start(ROW)

    api.submit(11)

    expect(patch).toHaveBeenCalledWith(
      '/boats/1/budget/entries/11',
      expect.objectContaining({ preserveScroll: true })
    )
    // La ligne reste ouverte pendant la requête.
    expect(api.editingId.value).toBe(11)
    expect(reset).not.toHaveBeenCalled()
  })

  test('au succès seulement, la ligne se referme et le formulaire se remet à zéro', () => {
    const { api } = setup()
    api.start(ROW)
    api.submit(11)

    const options = patch.mock.calls.at(-1)![1] as { onSuccess: () => void }
    options.onSuccess()

    expect(api.editingId.value).toBe(null)
    expect(reset).toHaveBeenCalledOnce()
  })

  test('`isEditing` ne reconnaît que la ligne en cours', () => {
    const { api } = setup()

    expect(api.isEditing(11)).toBe(false)
    api.start(ROW)
    expect(api.isEditing(11)).toBe(true)
    expect(api.isEditing(12)).toBe(false)
  })
})
