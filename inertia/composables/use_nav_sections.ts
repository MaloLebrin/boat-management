import { computed } from 'vue'
import { useT } from '~/composables/use_t'

export function useNavSections() {
  const { t } = useT()

  const navSections = computed(() => [
    {
      label: t('nav.sections.fleet'),
      items: [
        { name: t('nav.dashboard'), path: '/dashboard', route: 'dashboard', icon: 'house' },
        { name: t('nav.myBoats'), path: '/boats', route: null, icon: 'boat' },
        { name: t('nav.reservations'), path: '/reservations', route: null, icon: 'calendar-check' },
        { name: t('ports.nav'), path: '/ports', route: null, icon: 'anchor' },
        { name: t('nav.crew'), path: '/crew', route: null, icon: 'people' },
      ],
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
  ])

  return { navSections }
}
