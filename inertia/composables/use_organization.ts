import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'
import type { OrgRole } from '../../shared/types/organization'

interface OrganizationData {
  id: number
  name: string
}

interface UseOrganizationParams {
  organization: MaybeRefOrGetter<OrganizationData | null | undefined>
  currentUserRole?: MaybeRefOrGetter<OrgRole | null | undefined>
}

interface UseOrganizationReturn {
  organization: ComputedRef<OrganizationData | null>
  currentUserRole: ComputedRef<OrgRole | null>
  isAdmin: ComputedRef<boolean>
  isMember: ComputedRef<boolean>
}

export function useOrganization(params: UseOrganizationParams): UseOrganizationReturn {
  const organization = computed(() => toValue(params.organization) ?? null)
  const currentUserRole = computed(() => toValue(params.currentUserRole) ?? null)
  const isAdmin = computed(() => currentUserRole.value === 'admin')
  const isMember = computed(() => currentUserRole.value === 'member')

  return {
    organization,
    currentUserRole,
    isAdmin,
    isMember,
  }
}
