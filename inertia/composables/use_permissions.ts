import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Capability, PermissionsSharedProps } from '#shared/types/permissions'

export function usePermissions() {
  const page = usePage()

  const permissions = computed(
    () => (page.props.permissions as PermissionsSharedProps | undefined) ?? null
  )
  const role = computed(() => permissions.value?.role ?? null)
  const capabilitySet = computed(() => new Set(permissions.value?.capabilities ?? []))

  return {
    role,
    isAdmin: computed(() => role.value === 'admin'),
    isMember: computed(() => role.value === 'member'),
    isMechanic: computed(() => role.value === 'mechanic'),
    isBoatOwner: computed(() => role.value === 'boat_owner'),
    can: (capability: Capability) => capabilitySet.value.has(capability),
  }
}
