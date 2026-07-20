import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import PricingConfigurator from '../../inertia/components/marketing/pricing/PricingConfigurator.vue'

function makeProps(billing: 'monthly' | 'annual' = 'monthly') {
  return {
    eyebrow: 'CONFIG',
    title: 'Composez',
    titleHighlight: 'votre offre',
    subtitle: 'Sub',
    baseName: 'Socle Pro',
    baseDesc: 'Desc',
    basePriceMonthly: 20,
    basePriceAnnual: 16,
    modulesLabel: 'Modules',
    perMonth: '/mois',
    perYear: '/an',
    totalLabel: 'Total',
    annualSaveLabel: 'Économie',
    billedAnnuallyNote: 'Facturé annuellement.',
    ctaLabel: 'Commencer',
    ctaHref: '/signup',
    modules: [
      {
        key: 'charter',
        icon: '📅',
        name: 'Location',
        desc: 'Desc',
        priceMonthly: 15,
        priceAnnual: 12,
        features: ['Tarif par bateau'],
      },
      {
        key: 'crm_invoicing',
        icon: '🧾',
        name: 'CRM & Facturation',
        desc: 'Desc',
        priceMonthly: 15,
        priceAnnual: 12,
        features: ['Devis & factures'],
      },
    ],
    enterprise: {
      name: 'Entreprise',
      priceMonthly: 99,
      priceAnnual: 79,
      note: 'Note',
      ctaLabel: 'Voir Entreprise',
    },
    billing,
  }
}

test('total starts at the base price with no module selected', () => {
  const w = mount(PricingConfigurator, { props: makeProps('monthly') })
  expect(w.vm.total).toBe(20)
  expect(w.text()).toContain('20 €')
})

test('selecting a module adds its monthly price to the total', async () => {
  const w = mount(PricingConfigurator, { props: makeProps('monthly') })
  const switches = w.findAll('[role="switch"]')
  await switches[0].trigger('click')
  expect(w.vm.total).toBe(35)
  await switches[1].trigger('click')
  expect(w.vm.total).toBe(50)
})

test('toggling a module off removes its price', async () => {
  const w = mount(PricingConfigurator, { props: makeProps('monthly') })
  const firstSwitch = w.findAll('[role="switch"]')[0]
  await firstSwitch.trigger('click')
  expect(w.vm.total).toBe(35)
  await firstSwitch.trigger('click')
  expect(w.vm.total).toBe(20)
})

test('annual billing uses the discounted per-month prices', async () => {
  const w = mount(PricingConfigurator, { props: makeProps('annual') })
  expect(w.vm.total).toBe(16)
  await w.findAll('[role="switch"]')[0].trigger('click')
  expect(w.vm.total).toBe(28)
})

test('annual saving reflects the yearly gap for the current selection', async () => {
  const w = mount(PricingConfigurator, { props: makeProps('annual') })
  // base only: (20 - 16) * 12 = 48
  expect(w.vm.annualSaving).toBe(48)
  await w.findAll('[role="switch"]')[0].trigger('click')
  // base + charter: ((20+15) - (16+12)) * 12 = 84
  expect(w.vm.annualSaving).toBe(84)
})

function makePropsWithExtraBoats(billing: 'monthly' | 'annual') {
  return {
    ...makeProps(billing),
    extraBoats: {
      name: 'Bateaux supplémentaires',
      desc: 'Au-delà du forfait inclus',
      priceMonthly: 4,
      priceAnnual: 3,
      perBoatLabel: '/bateau/mois',
    },
  }
}

test('extra boats show the monthly unit price with no annual note', () => {
  const w = mount(PricingConfigurator, { props: makePropsWithExtraBoats('monthly') })

  expect(w.text()).toContain('4 € /bateau/mois')
  expect(w.text()).not.toContain('Facturé annuellement.')
})

test('extra boats show the discounted unit price with the billed-annually note', () => {
  const w = mount(PricingConfigurator, { props: makePropsWithExtraBoats('annual') })

  expect(w.text()).toContain('3 € /bateau/mois')
  expect(w.text()).toContain('Facturé annuellement.')
})

test('module cards show the billed-annually note only when annual', () => {
  const monthly = mount(PricingConfigurator, { props: makeProps('monthly') })
  expect(monthly.text()).not.toContain('Facturé annuellement.')

  const annual = mount(PricingConfigurator, { props: makeProps('annual') })
  expect(annual.text()).toContain('Facturé annuellement.')
})
