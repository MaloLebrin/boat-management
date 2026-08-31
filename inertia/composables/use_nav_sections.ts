import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { usePlan } from '~/composables/use_plan'
import { usePermissions } from '~/composables/use_permissions'

export function useNavSections() {
  const { t } = useT()
  const { effectiveQuotas } = usePlan()
  const { isBoatOwner, isMechanic, can } = usePermissions()

  const canManageClients = computed(() => effectiveQuotas.value?.canManageClients === true)
  const canManagePricing = computed(() => effectiveQuotas.value?.canManagePricing === true)
  const canManageInvoices = computed(() => effectiveQuotas.value?.canManageInvoices === true)
  // Cartographie de port réservée aux plans Pro et Entreprise (#604) — même
  // garde que `RequirePortsPlanMiddleware` côté serveur, sinon lien mort.
  const canManagePorts = computed(() => effectiveQuotas.value?.canManagePorts === true)
  // Réservations réservées au module Location / plan Entreprise (#595) — même
  // garde que `RequireReservationsPlanMiddleware` côté serveur.
  const canManageReservations = computed(
    () => effectiveQuotas.value?.canManageReservations === true
  )

  const navSections = computed(() => {
    // Portail self-service : accès restreint à ses propres bateaux, aucune des
    // sections staff (flotte, activité, maintenance, business) n'est pertinente.
    if (isBoatOwner.value) {
      return [
        {
          label: t('nav.sections.fleet'),
          items: [{ name: t('nav.myBoats'), path: '/owner/boats', route: null, icon: 'boat' }],
        },
      ]
    }

    // Chaque item est gardé derrière la même capability que celle vérifiée
    // côté serveur sur la route correspondante — cf. #397 (liens morts pour
    // mechanic, dont les capabilities se limitent à maintenance.*).
    // Type explicite : sans lui, l'inférence fige `route: string` sur le seul
    // item du littéral et rejette les `route: null` poussés ensuite.
    const fleetItems: { name: string; path: string; route: string | null; icon: string }[] = [
      { name: t('nav.dashboard'), path: '/dashboard', route: 'dashboard', icon: 'house' },
    ]
    if (can('boats.view')) {
      fleetItems.push({ name: t('nav.boats'), path: '/boats', route: null, icon: 'boat' })
      // Inventaire moteur transverse (#598) — même capability que `/boats`, dont
      // il n'est qu'une autre entrée : `EnginesController.index` autorise avec
      // `BoatPolicy.view`.
      fleetItems.push({ name: t('nav.engines'), path: '/engines', route: null, icon: 'engine' })
    }
    if (canManagePorts.value && can('ports.view')) {
      fleetItems.push({ name: t('ports.nav'), path: '/ports', route: null, icon: 'anchor' })
    }
    if (can('crew.create')) {
      fleetItems.push({ name: t('nav.crew'), path: '/crew', route: null, icon: 'people' })
    }

    const activityItems: { name: string; path: string; route: null; icon: string }[] = []
    if (can('boats.view')) {
      activityItems.push(
        { name: t('nav.logbook'), path: '/navigation/logbook', route: null, icon: 'compass' },
        { name: t('nav.fuel'), path: '/navigation/fuel', route: null, icon: 'fuel' }
      )
    }
    if (can('incidents.view')) {
      activityItems.push({
        name: t('nav.incidents'),
        path: '/navigation/incidents',
        route: null,
        icon: 'alert-triangle',
      })
    }

    const maintenanceItems: { name: string; path: string; route: null; icon: string }[] = []
    if (can('maintenance.view')) {
      maintenanceItems.push(
        { name: t('nav.planning'), path: '/planning', route: null, icon: 'calendar' },
        { name: t('nav.history'), path: '/maintenance/history', route: null, icon: 'clock' },
        { name: t('nav.diagnostic'), path: '/diagnostic', route: null, icon: 'alert-triangle' },
        { name: t('nav.spareParts'), path: '/spare-parts', route: null, icon: 'gear' }
      )
    }

    const businessItems: { name: string; path: string; route: null; icon: string }[] = []
    if (canManageReservations.value && can('boats.view')) {
      businessItems.push({
        name: t('nav.reservations'),
        path: '/reservations',
        route: null,
        icon: 'calendar-check',
      })
    }

    if (canManageClients.value && can('clients.create')) {
      businessItems.push({ name: t('nav.clients'), path: '/clients', route: null, icon: 'people' })
    }

    if (canManageInvoices.value && can('invoices.view')) {
      businessItems.push({
        name: t('nav.invoices'),
        path: '/invoices',
        route: null,
        icon: 'receipt',
      })
    }

    if (canManagePricing.value && can('pricing_seasons.create')) {
      businessItems.push({
        name: t('nav.pricingSeasons'),
        path: '/pricing/seasons',
        route: null,
        icon: 'calendar',
      })
    }

    return [
      { label: t('nav.sections.fleet'), items: fleetItems },
      { label: t('nav.sections.activity'), items: activityItems },
      { label: t('nav.sections.maintenance'), items: maintenanceItems },
      { label: t('nav.sections.business'), items: businessItems },
    ].filter((section) => section.items.length > 0)
  })

  const settingsItem = computed(() => ({
    name: t('nav.settings'),
    path: '/settings',
    route: null,
    icon: 'gear',
  }))

  /**
   * Raccourcis de la bottom tab bar mobile (#492) — 4 entrées max, gardées par
   * les mêmes capabilities que la nav complète. Le drawer reste la navigation
   * exhaustive ; ceci n'est qu'un jeu de raccourcis par rôle.
   */
  const bottomNavItems = computed(() => {
    // Portail self-service : un seul écran pertinent, la barre n'apporte rien
    if (isBoatOwner.value) return []

    const items = [{ name: t('nav.dashboard'), path: '/dashboard', icon: 'house' }]

    if (isMechanic.value) {
      // Terrain : alternance permanente planning ↔ fiche bateau
      if (can('maintenance.view')) {
        items.push(
          { name: t('nav.planning'), path: '/planning', icon: 'calendar' },
          { name: t('nav.history'), path: '/maintenance/history', icon: 'clock' }
        )
      }
      if (can('boats.view')) {
        items.push({ name: t('nav.boats'), path: '/boats', icon: 'boat' })
      }
    } else {
      if (can('boats.view')) {
        items.push({ name: t('nav.boats'), path: '/boats', icon: 'boat' })
      }
      if (can('maintenance.view')) {
        items.push({ name: t('nav.planning'), path: '/planning', icon: 'calendar' })
      }
      if (canManageReservations.value && can('boats.view')) {
        items.push({
          name: t('nav.reservations'),
          path: '/reservations',
          icon: 'calendar-check',
        })
      }
    }

    return items.slice(0, 4)
  })

  return { navSections, settingsItem, bottomNavItems }
}
