import type { OrgRole } from '#shared/types/organization'

export type Capability =
  | 'members.view'
  | 'members.manage'
  | 'invitations.view'
  | 'invitations.manage'
  | 'ai.configure'
  | 'branding.configure'
  | 'audit_log.view'
  | 'boats.view'
  | 'boats.create'
  | 'boats.edit'
  | 'boats.delete'
  | 'boats.manage'
  | 'boats.reservations.delete'
  | 'clients.create'
  | 'clients.update'
  | 'clients.delete'
  | 'clients.anonymize'
  | 'crew.create'
  | 'crew.update'
  | 'crew.delete'
  | 'fuel_logs.create'
  | 'fuel_logs.delete'
  | 'equipmentActions.view'
  | 'equipmentActions.create'
  | 'equipmentActions.edit'
  | 'equipmentActions.delete'
  | 'incidents.view'
  | 'incidents.create'
  | 'incidents.edit'
  | 'incidents.delete'
  | 'inspections.view'
  | 'inspections.create'
  | 'inspections.edit'
  | 'inspections.delete'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.update'
  | 'invoices.delete'
  | 'maintenance.view'
  | 'maintenance.create'
  | 'maintenance.edit'
  | 'maintenance.delete'
  | 'mouillages.view'
  | 'mouillages.create'
  | 'mouillages.edit'
  | 'mouillages.delete'
  | 'navigation_logs.create'
  | 'navigation_logs.update'
  | 'navigation_logs.delete'
  | 'ports.view'
  | 'ports.create'
  | 'ports.edit'
  | 'ports.delete'
  | 'pricing_seasons.create'
  | 'pricing_seasons.update'
  | 'pricing_seasons.delete'
  | 'rentalContracts.view'
  | 'rentalContracts.create'
  | 'rentalContracts.edit'
  | 'rentalContracts.delete'
  | 'simulator.manage_leads'
  | 'spots.view'
  | 'spots.create'
  | 'spots.edit'
  | 'spots.delete'
  | 'subscription.view'
  | 'subscription.manage'

const ADMIN_ONLY_CAPABILITIES: Capability[] = [
  'members.manage',
  'invitations.manage',
  'ai.configure',
  'branding.configure',
  'boats.delete',
  'clients.delete',
  'clients.anonymize',
  'crew.delete',
  'fuel_logs.delete',
  'equipmentActions.delete',
  'incidents.delete',
  'inspections.delete',
  'invoices.delete',
  'maintenance.delete',
  'mouillages.create',
  'mouillages.edit',
  'mouillages.delete',
  'navigation_logs.delete',
  'ports.create',
  'ports.edit',
  'ports.delete',
  'pricing_seasons.delete',
  'rentalContracts.delete',
  'simulator.manage_leads',
  'spots.delete',
  'subscription.manage',
]

const MEMBER_CAPABILITIES: Capability[] = [
  'members.view',
  'invitations.view',
  'audit_log.view',
  'boats.view',
  'boats.create',
  'boats.edit',
  'boats.manage',
  'boats.reservations.delete',
  'clients.create',
  'clients.update',
  'crew.create',
  'crew.update',
  'fuel_logs.create',
  'equipmentActions.view',
  'equipmentActions.create',
  'equipmentActions.edit',
  'incidents.view',
  'incidents.create',
  'incidents.edit',
  'inspections.view',
  'inspections.create',
  'inspections.edit',
  'invoices.view',
  'invoices.create',
  'invoices.update',
  'maintenance.view',
  'maintenance.create',
  'maintenance.edit',
  'mouillages.view',
  'navigation_logs.create',
  'navigation_logs.update',
  'ports.view',
  'pricing_seasons.create',
  'pricing_seasons.update',
  'rentalContracts.view',
  'rentalContracts.create',
  'rentalContracts.edit',
  'spots.view',
  'spots.create',
  'spots.edit',
  'subscription.view',
]

// Staff restreint au module maintenance, organisation entière (pas d'assignation par tâche).
const MECHANIC_CAPABILITIES: Capability[] = [
  'maintenance.view',
  'maintenance.create',
  'maintenance.edit',
]

// Accès self-service en lecture seule au portail dédié /owner/boats/:id, scopé par
// ownership au niveau requête (BoatOwnerService.getOwnedBoat), jamais par capability.
// Volontairement vide : aucune capability staff (boats.view, invoices.view...) ne doit
// être accordée ici, sous peine de donner accès aux pages staff complètes (/boats/:id,
// /invoices) qui exposent bien plus que le périmètre du portail.
const BOAT_OWNER_CAPABILITIES: Capability[] = []

export const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<Capability>> = {
  admin: new Set([...MEMBER_CAPABILITIES, ...ADMIN_ONLY_CAPABILITIES]),
  member: new Set(MEMBER_CAPABILITIES),
  mechanic: new Set(MECHANIC_CAPABILITIES),
  boat_owner: new Set(BOAT_OWNER_CAPABILITIES),
}

export interface PermissionsSharedProps {
  role: OrgRole | null
  capabilities: Capability[]
}
