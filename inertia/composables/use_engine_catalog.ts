import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'
import type { EngineBrandOption, EngineModelOption } from '../../shared/types/engine_catalog'

interface UseEngineCatalogReturn {
  brands: ComputedRef<EngineBrandOption[]>
  catalogModels: ComputedRef<EngineModelOption[]>
  catalogBrandId: ComputedRef<number | null>
}

/**
 * Catalogue moteur (#573) exposé par le contrôleur de la page courante
 * (`EngineCatalogService.formProps`).
 *
 * Lu depuis les props de page plutôt que passé de main en main : le formulaire
 * moteur est monté à quatre niveaux sous `boats/show` (onglet Équipement →
 * carte Moteurs / modale d'ajout), et faire descendre trois props à travers
 * toute la chaîne rendrait chaque composant intermédiaire dépendant d'un
 * catalogue dont il n'a que faire.
 *
 * Les trois valeurs retombent sur un catalogue vide quand la page ne les porte
 * pas : le formulaire redevient alors de la saisie libre, ce qui reste un état
 * parfaitement valide.
 */
export function useEngineCatalog(): UseEngineCatalogReturn {
  const page = usePage()
  const props = () => page.props as Record<string, unknown>

  return {
    brands: computed(() => (props().engineBrands as EngineBrandOption[] | undefined) ?? []),
    catalogModels: computed(
      () => (props().engineCatalogModels as EngineModelOption[] | undefined) ?? []
    ),
    catalogBrandId: computed(
      () => (props().engineCatalogBrandId as number | null | undefined) ?? null
    ),
  }
}
