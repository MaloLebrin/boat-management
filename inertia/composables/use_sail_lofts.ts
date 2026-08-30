import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'
import type { SailLoftOption } from '../../shared/types/sail_loft'

interface UseSailLoftsReturn {
  lofts: ComputedRef<SailLoftOption[]>
  catalogLoftId: ComputedRef<number | null>
}

/**
 * Référentiel des voileries (#578) exposé par le contrôleur de la page courante
 * (`SailLoftService.formProps`), miroir de `useEquipmentCatalog` (#577).
 *
 * Lu depuis les props de page plutôt que passé de main en main : le formulaire
 * voile est monté à plusieurs niveaux (carte Voiles / modale d'ajout sous
 * `boats/show`, page `boats/sail_edit`).
 *
 * Les deux valeurs retombent sur un référentiel vide quand la page ne les porte
 * pas : le formulaire redevient alors de la saisie libre, ce qui reste un état
 * parfaitement valide.
 */
export function useSailLofts(): UseSailLoftsReturn {
  const page = usePage()
  const props = () => page.props as Record<string, unknown>

  return {
    lofts: computed(() => (props().sailLofts as SailLoftOption[] | undefined) ?? []),
    catalogLoftId: computed(() => (props().sailCatalogLoftId as number | null | undefined) ?? null),
  }
}
