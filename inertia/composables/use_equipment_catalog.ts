import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'
import type {
  EquipmentBrandOption,
  EquipmentModelOption,
} from '../../shared/types/equipment_catalog'

interface UseEquipmentCatalogReturn {
  brands: ComputedRef<EquipmentBrandOption[]>
  catalogModels: ComputedRef<EquipmentModelOption[]>
  catalogBrandId: ComputedRef<number | null>
}

/**
 * Catalogue d'équipements (#577) exposé par le contrôleur de la page courante
 * (`EquipmentCatalogService.formProps`), miroir de `useEngineCatalog` (#573).
 *
 * Lu depuis les props de page plutôt que passé de main en main : le formulaire
 * d'équipement générique est monté à plusieurs niveaux sous `boats/show`
 * (onglet Équipement → carte Équipements / modale d'ajout).
 *
 * Les trois valeurs retombent sur un catalogue vide quand la page ne les porte
 * pas : le formulaire redevient alors de la saisie libre, ce qui reste un état
 * parfaitement valide.
 */
export function useEquipmentCatalog(): UseEquipmentCatalogReturn {
  const page = usePage()
  const props = () => page.props as Record<string, unknown>

  return {
    brands: computed(() => (props().equipmentBrands as EquipmentBrandOption[] | undefined) ?? []),
    catalogModels: computed(
      () => (props().equipmentCatalogModels as EquipmentModelOption[] | undefined) ?? []
    ),
    catalogBrandId: computed(
      () => (props().equipmentCatalogBrandId as number | null | undefined) ?? null
    ),
  }
}
