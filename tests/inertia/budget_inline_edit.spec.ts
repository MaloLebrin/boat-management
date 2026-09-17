import { describe, expect, test, vi } from 'vitest'
import { forms, formSpies, mountWithStubs } from './helpers/mount'
import type { BoatBudgetEntryItem, BoatPortStayItem } from '../../shared/types/budget'

/**
 * Caractérisation du cycle d'édition inline des deux listes de budget, avant
 * l'extraction du composable partagé (vague 3.5). Toutes deux tiennent la même
 * mécanique : une réf sur la ligne éditée, un `useForm` rempli depuis cette
 * ligne, une annulation qui remet le formulaire à zéro, et un envoi qui
 * referme la ligne **au succès seulement**.
 *
 * Ce que les specs existantes couvraient déjà : la présence des boutons et les
 * suggestions de ports. Ce cycle, non.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `${v} €` }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (s: string) => s }),
}))

import BudgetEntryList from '../../inertia/components/boats/budget/BudgetEntryList.vue'
import BudgetPortStayList from '../../inertia/components/boats/budget/BudgetPortStayList.vue'

/** Le dernier `useForm()` créé par le composant monté. */
function editForm() {
  return forms.at(-1)!
}

async function clickEdit(wrapper: ReturnType<typeof mountWithStubs>) {
  const button = wrapper.findAll('button').find((b) => b.text().trim() === 'common.edit')
  expect(button, 'bouton d’édition introuvable').toBeTruthy()
  await button!.trigger('click')
}

async function clickCancel(wrapper: ReturnType<typeof mountWithStubs>) {
  const button = wrapper.findAll('button').find((b) => b.text().trim() === 'common.cancel')
  expect(button, 'bouton d’annulation introuvable').toBeTruthy()
  await button!.trigger('click')
}

describe('BudgetEntryList — édition inline', () => {
  const entry: BoatBudgetEntryItem = {
    id: 11,
    label: 'Taxe de francisation',
    amount: 1250,
    date: '2026-03-15',
    category: 'documents',
    description: 'annuelle',
  }

  function mountList() {
    return mountWithStubs(BudgetEntryList, {
      props: { boatId: 1, entries: [entry], canManage: true },
    })
  }

  test('éditer charge la ligne dans le formulaire', async () => {
    const w = mountList()

    await clickEdit(w)

    expect(w.find('form').exists()).toBe(true)
    expect(editForm().label).toBe('Taxe de francisation')
    // Les montants du formulaire HTML sont des chaînes.
    expect(editForm().amount).toBe('1250')
    expect(editForm().date).toBe('2026-03-15')
    expect(editForm().category).toBe('documents')
    expect(editForm().description).toBe('annuelle')
  })

  test('annuler referme la ligne et remet le formulaire à zéro', async () => {
    const w = mountList()
    await clickEdit(w)

    await clickCancel(w)

    expect(w.find('form').exists()).toBe(false)
    expect(formSpies.reset).toHaveBeenCalled()
  })

  test('envoyer patche la ligne, et ne referme qu’au succès', async () => {
    const w = mountList()
    await clickEdit(w)

    await w.find('form').trigger('submit')

    expect(formSpies.patch).toHaveBeenCalledWith(
      '/boats/1/budget/entries/11',
      expect.objectContaining({ preserveScroll: true })
    )
    // Pendant la requête, la ligne reste ouverte.
    expect(w.find('form').exists()).toBe(true)

    const options = formSpies.patch.mock.calls.at(-1)![1] as { onSuccess: () => void }
    options.onSuccess()
    await w.vm.$nextTick()

    expect(w.find('form').exists()).toBe(false)
    expect(formSpies.reset).toHaveBeenCalled()
    w.unmount()
  })
})

describe('BudgetPortStayList — édition inline', () => {
  const stay = {
    id: 22,
    portId: 7,
    portName: 'Port-la-Forêt',
    startedAt: '2026-01-01',
    endedAt: null,
    cost: 300,
    notes: null,
  } as BoatPortStayItem

  function mountList() {
    return mountWithStubs(BudgetPortStayList, {
      props: { boatId: 1, stays: [stay], canManage: true },
    })
  }

  test('éditer charge l’escale, `null` devenant chaîne vide', async () => {
    const w = mountList()

    await clickEdit(w)

    expect(editForm().portName).toBe('Port-la-Forêt')
    expect(editForm().startedAt).toBe('2026-01-01')
    expect(editForm().endedAt).toBe('')
    expect(editForm().cost).toBe('300')
    expect(editForm().notes).toBe('')
  })

  test('envoyer patche l’escale, et ne referme qu’au succès', async () => {
    const w = mountList()
    await clickEdit(w)

    await w.find('form').trigger('submit')

    expect(formSpies.patch).toHaveBeenCalledWith(
      '/boats/1/port-stays/22',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(w.find('form').exists()).toBe(true)

    const options = formSpies.patch.mock.calls.at(-1)![1] as { onSuccess: () => void }
    options.onSuccess()
    await w.vm.$nextTick()

    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })

  test('annuler referme la ligne et remet le formulaire à zéro', async () => {
    const w = mountList()
    await clickEdit(w)

    await clickCancel(w)

    expect(w.find('form').exists()).toBe(false)
    expect(formSpies.reset).toHaveBeenCalled()
  })
})
