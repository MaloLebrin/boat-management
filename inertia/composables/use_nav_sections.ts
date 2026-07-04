import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { PLAN_LIMITS } from '../../shared/types/plan'
import type { PlanTier } from '../../shared/types/plan'

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

export function useNavSections() {
  const { t } = useT()
  const page = usePage()

  const canManageClients = computed(() => {
    const plan = page.props.currentPlan
    if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
    return PLAN_LIMITS[plan as PlanTier].canManageClients
  })

  const navSections = computed(() => {
    const fleetItems = [
      { name: t('nav.dashboard'), path: '/dashboard', route: 'dashboard', icon: 'house' },
      { name: t('nav.myBoats'), path: '/boats', route: null, icon: 'boat' },
      { name: t('nav.reservations'), path: '/reservations', route: null, icon: 'calendar-check' },
      { name: t('ports.nav'), path: '/ports', route: null, icon: 'anchor' },
      { name: t('nav.crew'), path: '/crew', route: null, icon: 'people' },
    ]

    if (canManageClients.value) {
      fleetItems.push({ name: t('nav.clients'), path: '/clients', route: null, icon: 'people' })
    }

    return [
      {
        label: t('nav.sections.fleet'),
        items: fleetItems,
      },
      {
        label: t('nav.sections.maintenance'),
        items: [
          { name: t('nav.planning'), path: '/planning', route: null, icon: 'calendar' },
          { name: t('nav.history'), path: '/maintenance/history', route: null, icon: 'clock' },
        ],
      },
      {
        label: t('nav.sections.navigation'),
        items: [
          { name: t('nav.logbook'), path: '/navigation/logbook', route: null, icon: 'compass' },
          { name: t('nav.fuel'), path: '/navigation/fuel', route: null, icon: 'fuel' },
          {
            name: t('nav.incidents'),
            path: '/navigation/incidents',
            route: null,
            icon: 'alert-triangle',
          },
        ],
      },
      {
        label: t('nav.sections.preferences'),
        items: [{ name: t('nav.settings'), path: '/settings', route: null, icon: 'gear' }],
      },
    ]
  })

  return { navSections }
}
