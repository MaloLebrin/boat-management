import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

/**
 * Les maquettes « screenshot » de la home (HomeMock*) affichaient ~110 chaînes
 * françaises en dur, visibles telles quelles sur le site EN. Ce spec monte
 * chaque maquette avec les vraies traductions (`homePreview.json`) injectées
 * dans `appT` — comme le fait InertiaMiddleware — et vérifie que le rendu suit
 * la locale : libellés EN présents, aucune chaîne FR résiduelle (et inversement).
 */

const ROOT = process.cwd()

function flatten(value: unknown, prefix: string, out: Record<string, string>) {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
    return
  }
  out[prefix] = String(value)
}

function loadAppT(locale: 'en' | 'fr'): Record<string, string> {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'resources/lang', locale, 'homePreview.json'), 'utf8')
  )
  const out: Record<string, string> = {}
  flatten(raw, 'homePreview', out)
  return out
}

const pageProps: { appT: Record<string, string>; locale: 'en' | 'fr' } = {
  appT: loadAppT('en'),
  locale: 'en',
}

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: () => ({ props: pageProps }),
  }
})

import HomeMockBoatDetail from '../../inertia/components/marketing/home/HomeMockBoatDetail.vue'
import HomeMockDashboard from '../../inertia/components/marketing/home/HomeMockDashboard.vue'
import HomeMockFleetide from '../../inertia/components/marketing/home/HomeMockFleetide.vue'
import HomeMockPlanning from '../../inertia/components/marketing/home/HomeMockPlanning.vue'
import HomeMockUpcomingTasks from '../../inertia/components/marketing/home/HomeMockUpcomingTasks.vue'

function useLocale(locale: 'en' | 'fr') {
  pageProps.appT = loadAppT(locale)
  pageProps.locale = locale
}

interface MockCase {
  name: string
  component: Parameters<typeof mount>[0]
  en: string[]
  fr: string[]
}

const cases: MockCase[] = [
  {
    name: 'HomeMockDashboard',
    component: HomeMockDashboard,
    en: ['3 maintenance tasks overdue', 'Sailboat', 'Overdue', 'Schedule', 'Boats', 'History'],
    fr: ['3 maintenances en retard', 'Voilier', 'Retard', 'Planifier', 'Bateaux', 'Historique'],
  },
  {
    name: 'HomeMockBoatDetail',
    component: HomeMockBoatDetail,
    en: ['Engine oil change 42h overdue', 'Specifications', 'Draft', 'Create task', 'Location'],
    fr: [
      'Vidange moteur en retard de 42h',
      'Spécifications',
      "Tirant d'eau",
      'Créer tâche',
      'Emplacement',
    ],
  },
  {
    name: 'HomeMockPlanning',
    component: HomeMockPlanning,
    en: ['Maintenance planning', 'May 2025', 'Calendar', 'Mon', 'Planned', 'Done'],
    fr: ['Planning maintenance', 'Mai 2025', 'Calendrier', 'Lun', 'Planifié', 'Terminé'],
  },
  {
    name: 'HomeMockFleetide',
    component: HomeMockFleetide,
    en: [
      'AI copilot for your fleet',
      '3 urgent maintenance tasks',
      'Rigging check (3d overdue)',
      'View details',
      'Task created for',
    ],
    fr: [
      'Copilote IA pour ta flotte',
      '3 maintenances urgentes',
      'Contrôle gréement (retard 3j)',
      'Voir détails',
      'Tâche créée pour',
    ],
  },
  {
    name: 'HomeMockUpcomingTasks',
    component: HomeMockUpcomingTasks,
    en: ['Upcoming', 'Antifouling - May 12', 'Hull cleaning - Jun 20'],
    fr: ['À venir', 'Antifouling - 12 mai', 'Carénage - 20 juin'],
  },
]

describe('maquettes marketing — i18n', () => {
  for (const mockCase of cases) {
    test(`${mockCase.name} rend l'anglais sans résidu français`, () => {
      useLocale('en')
      const wrapper = mount(mockCase.component)
      const text = wrapper.text()
      for (const expected of mockCase.en) {
        expect(text).toContain(expected)
      }
      for (const stale of mockCase.fr) {
        expect(text).not.toContain(stale)
      }
    })

    test(`${mockCase.name} rend le français`, () => {
      useLocale('fr')
      const wrapper = mount(mockCase.component)
      const text = wrapper.text()
      for (const expected of mockCase.fr) {
        expect(text).toContain(expected)
      }
    })
  }

  test('le placeholder du chat FleetAi suit la locale', () => {
    useLocale('en')
    const wrapper = mount(HomeMockFleetide)
    expect(wrapper.get('input').attributes('placeholder')).toBe('Ask your question...')
  })

  test('les noms de la flotte de démo restent inchangés dans les deux locales', () => {
    for (const locale of ['en', 'fr'] as const) {
      useLocale(locale)
      const wrapper = mount(HomeMockDashboard)
      expect(wrapper.text()).toContain('Mistral II')
      expect(wrapper.text()).toContain('Marina Bleue')
    }
  })
})
