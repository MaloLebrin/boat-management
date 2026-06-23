export const policies = {
  BoatPolicy: () => import('#policies/boat_policy'),
  FuelLogPolicy: () => import('#policies/fuel_log_policy'),
  IncidentPolicy: () => import('#policies/incident_policy'),
  MaintenancePolicy: () => import('#policies/maintenance_policy'),
  MouillagePolicy: () => import('#policies/mouillage_policy'),
  NavigationLogPolicy: () => import('#policies/navigation_log_policy'),
  OrganizationInvitationPolicy: () => import('#policies/organization_invitation_policy'),
  OrganizationPolicy: () => import('#policies/organization_policy'),
  PortPolicy: () => import('#policies/port_policy'),
  SimulatorPolicy: () => import('#policies/simulator_policy'),
  SpotPolicy: () => import('#policies/spot_policy'),
  SubscriptionPolicy: () => import('#policies/subscription_policy'),
}

