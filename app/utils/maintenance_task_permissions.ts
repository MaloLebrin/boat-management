import MaintenancePolicy from '#policies/maintenance_policy'
import type Boat from '#models/boat'
import type { MaintenanceTaskPermissions } from '#shared/types/maintenance'
import type { HttpContext } from '@adonisjs/core/http'

/** Droits de création / clôture / suppression de tâches sur un bateau. */
export async function maintenanceTaskPermissions(
  bouncer: HttpContext['bouncer'],
  boat: Boat
): Promise<MaintenanceTaskPermissions> {
  const policy = bouncer.with(MaintenancePolicy)
  const [canCreate, canEdit, canDelete] = await Promise.all([
    policy.allows('create', boat),
    policy.allows('edit', boat),
    policy.allows('delete', boat),
  ])
  return { canCreate, canEdit, canDelete }
}
