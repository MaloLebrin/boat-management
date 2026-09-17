import { describe, expect, test, vi } from 'vitest'
import { mountWithStubs, routerSpies } from './helpers/mount'
import type { InvoiceRow, InvoicesPaginated } from '../../shared/types/invoice'
import type { PricingSeasonRow } from '../../shared/types/pricing_season'
import type { SpotRow } from '../../inertia/types/port'

/**
 * Caractérisation des suppressions confirmées **dans l'app** (modale
 * `BaseConfirmModal`), avant l'extraction du composable partagé (vague 3.5).
 *
 * Six écrans tiennent la même mécanique : une réf sur la ligne visée qui sert
 * d'ouverture à la modale, une fonction qui la pose, une autre qui supprime.
 *
 * Ce que ces tests établissent, et qui n'était pas évident à la lecture :
 * `BaseConfirmModal.confirm()` émet `confirm` **puis** `update:open: false`.
 * Les six écrans referment donc leur modale dès la confirmation, et le
 * `onFinish: () => (cible = null)` que trois pages passent à la visite ne
 * relâche jamais rien — la modale l'a déjà fait.
 *
 * `DocumentList` et `InspectionDefects` sont déjà couverts par leurs specs ;
 * `SpotsManager` porte ici la variante sans options de visite.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `${v} €` }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (s: string) => s, formatDateTime: (s: string) => s }),
}))

import PricingSeasonsIndex from '../../inertia/pages/pricing/seasons/index.vue'
import InvoicesIndex from '../../inertia/pages/invoices/index.vue'
import SpotsManager from '../../inertia/components/ports/show/SpotsManager.vue'

/** La modale de confirmation du doublon `BaseConfirmModal`. */
function modal(wrapper: { find: (s: string) => { exists: () => boolean } }) {
  return wrapper.find('[data-base-confirm-modal]')
}

describe('pages/pricing/seasons — confirmation dans l’app', () => {
  const season: PricingSeasonRow = {
    id: 12,
    boatId: 3,
    boatName: 'Pen Duick',
    name: 'Haute saison',
    startsOn: '2026-07-01',
    endsOn: '2026-08-31',
    dailyPrice: 450,
    multiplier: null,
    priority: 1,
    createdAt: null,
    updatedAt: null,
  }

  function mountPage() {
    return mountWithStubs(PricingSeasonsIndex, {
      props: {
        seasons: [season],
        boatOptions: [{ id: 3, name: 'Pen Duick' }],
        filters: { boatId: null },
        canDelete: true,
      },
      stubs: {
        PricingSeasonList: {
          name: 'PricingSeasonList',
          props: ['seasons', 'canDelete'],
          emits: ['edit', 'delete'],
          template: '<div />',
        },
        PricingSeasonForm: { template: '<div />' },
      },
    })
  }

  test('demander la suppression ouvre la modale sans rien envoyer', async () => {
    const w = mountPage()

    w.findComponent({ name: 'PricingSeasonList' }).vm.$emit('delete', season)
    await w.vm.$nextTick()

    expect(modal(w).exists()).toBe(true)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('annuler referme la modale sans rien envoyer', async () => {
    const w = mountPage()
    w.findComponent({ name: 'PricingSeasonList' }).vm.$emit('delete', season)
    await w.vm.$nextTick()

    await w.find('[data-cancel]').trigger('click')

    expect(modal(w).exists()).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('confirmer supprime et referme aussitôt ; le `onFinish` ne relâche rien', async () => {
    const w = mountPage()
    w.findComponent({ name: 'PricingSeasonList' }).vm.$emit('delete', season)
    await w.vm.$nextTick()

    await w.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/pricing/seasons/12',
      expect.objectContaining({ preserveScroll: true })
    )
    // La modale a émis `update:open: false` avec son `confirm`.
    expect(modal(w).exists()).toBe(false)

    // Le rappel de fin de visite retrouve une cible déjà relâchée : sans effet.
    const options = routerSpies.delete.mock.calls.at(-1)![1] as { onFinish: () => void }
    options.onFinish()
    await w.vm.$nextTick()

    expect(modal(w).exists()).toBe(false)
    w.unmount()
  })
})

describe('pages/invoices — confirmation dans l’app', () => {
  const invoice = {
    id: 7,
    kind: 'invoice',
    number: 'F-2026-007',
    status: 'draft',
    clientId: 2,
    clientName: 'Alice',
    reservationId: null,
    issuedAt: '2026-05-01',
    dueAt: null,
    paidAt: null,
    sourceQuoteId: null,
    subtotal: 1000,
    taxRate: 20,
    taxAmount: 200,
    total: 1200,
    currency: 'EUR',
    createdAt: null,
  } as InvoiceRow

  const invoices: InvoicesPaginated = {
    data: [invoice],
    meta: { total: 1, perPage: 20, currentPage: 1, lastPage: 1 },
  }

  function mountPage() {
    return mountWithStubs(InvoicesIndex, {
      props: {
        invoices,
        filters: {
          q: '',
          status: '',
          kind: '',
          clientId: null,
          issuedFrom: '',
          issuedTo: '',
          sort: 'issuedAt',
          direction: 'desc',
          page: 1,
          perPage: 20,
        },
        clientOptions: [],
        canDelete: true,
      },
      stubs: {
        InvoiceListToolbar: { template: '<div />' },
        InvoiceStatusBadge: { template: '<span />' },
        BasePagination: { template: '<div />' },
      },
    })
  }

  test('confirmer supprime la facture et referme aussitôt', async () => {
    const w = mountPage()

    const ask = w.findAll('button').find((b) => b.text().trim() === 'invoices.delete')
    expect(ask, 'bouton de suppression introuvable').toBeTruthy()
    await ask!.trigger('click')

    expect(modal(w).exists()).toBe(true)
    await w.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/invoices/7',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(modal(w).exists()).toBe(false)

    const options = routerSpies.delete.mock.calls.at(-1)![1] as { onFinish: () => void }
    options.onFinish()
    await w.vm.$nextTick()

    expect(modal(w).exists()).toBe(false)
    w.unmount()
  })
})

describe('SpotsManager — suppression sans options de visite', () => {
  const spot = { id: 5, name: 'A1', positionX: null, positionY: null, boat: null } as SpotRow

  function mountManager() {
    return mountWithStubs(SpotsManager, {
      props: {
        pontoonId: 4,
        portId: 3,
        spots: [spot],
        boats: [],
      } as Record<string, unknown>,
      stubs: {
        SpotFormModal: { template: '<div />' },
        BoatAssignModal: { template: '<div />' },
      },
    })
  }

  test('confirmer supprime le poste sans options et referme aussitôt', async () => {
    const w = mountManager()

    // Le bouton porte le libellé générique, en `sr-only` derrière l'icône.
    const ask = w.findAll('button').find((b) => b.text().trim() === 'common.delete')
    expect(ask, 'bouton de suppression introuvable').toBeTruthy()
    await ask!.trigger('click')

    expect(modal(w).exists()).toBe(true)
    await w.find('[data-confirm]').trigger('click')
    await w.vm.$nextTick()

    expect(routerSpies.delete).toHaveBeenCalledTimes(1)
    // Cet écran ne passe aucune option de visite.
    expect(routerSpies.delete.mock.calls[0]).toHaveLength(1)
    expect(modal(w).exists()).toBe(false)
    w.unmount()
  })
})
