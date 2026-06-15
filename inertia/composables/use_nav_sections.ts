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
        { name: t('ports.nav'), path: '/ports', route: null, icon: 'anchor' },
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
      label: t('nav.sections.preferences'),
      items: [{ name: t('nav.settings'), path: '/settings', route: null, icon: 'gear' }],
    },
  ])

  return { navSections }
}
