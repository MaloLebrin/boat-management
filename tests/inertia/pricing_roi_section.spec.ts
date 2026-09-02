import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import PricingROISection from '../../inertia/components/marketing/pricing/PricingROISection.vue'
import { ADDON_PRICES, PLAN_LIMITS, PLAN_PRICES } from '../../shared/types/plan'
import { formatPrice } from '../../shared/helpers/number_format'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: 'fr' } }) }
})

const props = {
  eyebrow: 'ROI',
  title: 'Combien tu économises',
  titleHighlight: 'chaque année',
  subtitle: 'Sub',
  profileLabel: 'Profil',
  boatsLabel: 'Bateaux',
  hourlyLabel: 'Taux horaire',
  studyNote: 'Étude',
  savingsLabel: 'Économies',
  perMonthLabel: 'soit {amount} / mois',
  timeLabel: 'Temps',
  maintLabel: 'Maintenance',
  fleetideLabel: 'Optimisations',
  fleetCostLabel: 'Coût FleetAi',
  roiLabel: 'ROI',
  ctaLabel: 'Démarrer',
  profiles: {
    loueurs: { label: 'Loueurs', emoji: '⛵' },
    ecoles: { label: 'Écoles', emoji: '🎓' },
    marinas: { label: 'Marinas', emoji: '⚓' },
    armateurs: { label: 'Armateurs', emoji: '🛥' },
  },
}

/**
 * Règle le curseur « nombre de bateaux » (le premier des deux `range` de la
 * section) et rend la valeur du bloc « Coût FleetAi ».
 */
async function fleetCostFor(boats: number): Promise<string> {
  const w = mount(PricingROISection, { props })
  await w.find('input[type="range"]').setValue(boats)
  const cells = w.findAll('p.font-mono.text-lg')
  return cells[cells.length - 1].text()
}

const proMax = PLAN_LIMITS.pro.maxBoats!
const starterMax = PLAN_LIMITS.starter.maxBoats!

// #612 — la section chiffrait le coût à 348 €/an (29 × 12, un tarif Pro qui
// n'existe plus), avec un seuil de 25 bateaux sans rapport avec PLAN_LIMITS.
test('a fleet within the Starter quota costs nothing', async () => {
  expect(await fleetCostFor(starterMax)).toBe(formatPrice(0, 'fr'))
})

test('a fleet within the Pro quota costs exactly the Pro annual total', async () => {
  expect(await fleetCostFor(proMax)).toBe(formatPrice(PLAN_PRICES.pro.annualTotal, 'fr'))
  // 348 = 29 × 12, l'ancien socle Pro que la section chiffrait encore.
  expect(await fleetCostFor(proMax)).not.toBe(formatPrice(348, 'fr'))
})

test('boats beyond the Pro quota are billed as extra_boats add-ons', async () => {
  const expected = PLAN_PRICES.pro.annualTotal + 4 * ADDON_PRICES.extra_boats.annualTotal

  expect(await fleetCostFor(proMax + 4)).toBe(formatPrice(expected, 'fr'))
})

test('a large fleet is capped by the Enterprise annual total', async () => {
  expect(await fleetCostFor(50)).toBe(formatPrice(PLAN_PRICES.enterprise.annualTotal, 'fr'))
})
