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
  | 'incidents.view'
  | 'incidents.create'
  | 'incidents.edit'
  | 'incidents.delete'
  | 'inspections.view'
  | 'inspections.create'
  | 'inspections.edit'
  | 'inspections.delete'
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
  'incidents.view',
  'incidents.create',
  'incidents.edit',
  'inspections.view',
  'inspections.create',
  'inspections.edit',
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

export const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<Capability>> = {
  admin: new Set([...MEMBER_CAPABILITIES, ...ADMIN_ONLY_CAPABILITIES]),
  member: new Set(MEMBER_CAPABILITIES),
}

export interface PermissionsSharedProps {
  role: OrgRole | null
  capabilities: Capability[]
}
