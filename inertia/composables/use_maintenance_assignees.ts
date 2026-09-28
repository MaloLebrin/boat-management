import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'
import type { MaintenanceAssigneeOption } from '#shared/types/maintenance'

/**
 * Membres à qui confier une tâche (#868), lus sur la prop de page
 * `maintenanceAssignees` que posent la fiche bateau et le planning. Les
 * formulaires rendus ailleurs n'ont pas la prop : la liste est vide et le
 * sélecteur ne s'affiche pas, plutôt que d'imposer la prop à chaque page qui
 * liste des tâches.
 */
export function useMaintenanceAssignees(): ComputedRef<MaintenanceAssigneeOption[]> {
  const page = usePage()
  return computed(
    () => (page?.props?.maintenanceAssignees as MaintenanceAssigneeOption[] | undefined) ?? []
  )
}
