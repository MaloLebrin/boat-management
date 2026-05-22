export const policies = {
  BoatPolicy: () => import('#policies/boat_policy'),
  MaintenancePolicy: () => import('#policies/maintenance_policy'),
  OrganizationPolicy: () => import('#policies/organization_policy'),
  PortPolicy: () => import('#policies/port_policy'),
}

