import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountWithStubs, routerSpies } from './helpers/mount'
import type { InvoiceDetail } from '../../shared/types/invoice'
import type { Capability } from '../../shared/types/permissions'

/**
 * Caractérisation des trois écrans qui confirment la suppression de **leur
 * propre** entité, avant extraction du composable (suite de #676, qui ne
 * couvrait que les suppressions de ligne). Chacun tient la même mécanique : un
 * booléen d'ouverture, une pose, une visite au moment de confirmer.
 *
 * Ce que ces tests figent, écran par écran : le clic n'envoie rien, l'annulation
 * n'envoie rien, la confirmation envoie la requête **exacte** — URL et options,
 * dont l'absence d'options de la page port — et la modale se referme.
 *
 * `ports_show_delete.spec.ts` (#398) couvre déjà la page port, gardes comprises ;
 * on n'y ajoute que l'annulation, qu'aucun test ne regardait.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
  Form: {
    props: ['action', 'method', 'transform'],
    template: '<form><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDate: (s: string) => s,
    formatDateLong: (s: string) => s,
    formatDateTime: (s: string) => s,
  }),
}))

beforeEach(() => {
  // La page port refuse la suppression d'un port occupé par un avis natif.
  window.alert = vi.fn()
})

import InvoiceShow from '../../inertia/pages/invoices/show.vue'
import BoatsEdit from '../../inertia/pages/boats/edit.vue'
import PortsShow from '../../inertia/pages/ports/show.vue'

/** Bouton de suppression : les trois écrans le rendent en `BaseButton` danger. */
async function clickDelete(w: VueWrapper, label: string) {
  const button = w.findAll('button').find((b) => b.text().includes(label))
  expect(button, `bouton « ${label} » introuvable`).toBeDefined()
  await button!.trigger('click')
}

function isModalOpen(w: VueWrapper): boolean {
  return w.find('[data-base-confirm-modal]').exists()
}

describe('invoices/show — suppression de la facture affichée', () => {
  function makeInvoice(): InvoiceDetail {
    return {
      id: 42,
      kind: 'quote',
      number: 'DEV-000001',
      status: 'draft',
      clientId: null,
      clientName: 'Alice Martin',
      reservationId: null,
      issuedAt: '2026-07-05',
      dueAt: null,
      paidAt: null,
      sourceQuoteId: null,
      subtotal: 100,
      taxRate: 20,
      taxAmount: 20,
      total: 120,
      currency: 'EUR',
      createdAt: null,
      notes: null,
      lines: [],
      sourceQuote: null,
      convertedInvoice: null,
      reservationBoatId: null,
    } as InvoiceDetail
  }

  function mountShow() {
    return mountWithStubs(InvoiceShow, {
      props: { invoice: makeInvoice(), canDelete: true },
      stubs: {
        InvoiceStatusBadge: { template: '<span />' },
        InvoiceLinesCard: { template: '<div />' },
      },
    })
  }

  test('le clic ouvre la modale sans rien envoyer', async () => {
    const w = mountShow()
    expect(isModalOpen(w)).toBe(false)

    await clickDelete(w, 'invoices.delete')

    expect(isModalOpen(w)).toBe(true)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('une annulation referme sans rien envoyer', async () => {
    const w = mountShow()
    await clickDelete(w, 'invoices.delete')

    await w.find('[data-cancel]').trigger('click')

    expect(isModalOpen(w)).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('la confirmation supprime avec `preserveScroll`, et la modale se referme', async () => {
    const w = mountShow()
    await clickDelete(w, 'invoices.delete')

    await w.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith('/invoices/42', { preserveScroll: true })
    expect(isModalOpen(w)).toBe(false)
    w.unmount()
  })
})

describe('boats/edit — suppression du bateau édité', () => {
  const CAPABILITIES: Capability[] = ['boats.edit', 'boats.delete']

  function mountEdit() {
    return mountWithStubs(BoatsEdit, {
      props: {
        boat: { id: 1, name: 'Sea Breeze', propulsionType: null, spotId: null },
        ports: [],
        owners: [],
        ownerCandidates: [],
      },
      pageProps: { permissions: { role: 'member', capabilities: CAPABILITIES } },
      stubs: {
        BoatFormHullFields: { template: '<div />' },
        BoatOwnersManager: { template: '<div />' },
      },
    })
  }

  test('le clic ouvre la modale sans rien envoyer', async () => {
    const w = mountEdit()
    expect(isModalOpen(w)).toBe(false)

    await clickDelete(w, 'common.delete')

    expect(isModalOpen(w)).toBe(true)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('une annulation referme sans rien envoyer', async () => {
    const w = mountEdit()
    await clickDelete(w, 'common.delete')

    await w.find('[data-cancel]').trigger('click')

    expect(isModalOpen(w)).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('la confirmation supprime, avec un `onFinish` qui relâche le chargement', async () => {
    const w = mountEdit()
    await clickDelete(w, 'common.delete')

    await w.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/1', {
      onFinish: expect.any(Function),
    })
    expect(isModalOpen(w)).toBe(false)
    w.unmount()
  })
})

describe('ports/show — suppression du port affiché', () => {
  function mountShow() {
    return mountWithStubs(PortsShow, {
      props: {
        port: {
          id: 9,
          name: 'Port Test',
          city: null,
          country: null,
          address: null,
          notes: null,
          pontoons: [],
          mouillages: [],
        },
        boats: [],
      },
      stubs: {
        BaseTabs: { template: '<div />' },
        MarinaMapTab: { template: '<div />' },
        PortListTab: { template: '<div />' },
      },
    })
  }

  test('une annulation referme sans rien envoyer', async () => {
    const w = mountShow()
    await clickDelete(w, 'common.delete')
    expect(isModalOpen(w)).toBe(true)

    await w.find('[data-cancel]').trigger('click')

    expect(isModalOpen(w)).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
    w.unmount()
  })

  test('la confirmation supprime — sans options de visite', async () => {
    const w = mountShow()
    await clickDelete(w, 'common.delete')

    await w.find('[data-confirm]').trigger('click')

    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/9')
    expect(isModalOpen(w)).toBe(false)
    w.unmount()
  })
})
