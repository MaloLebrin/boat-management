export const policies = {
  BoatPolicy: () => import('#policies/boat_policy'),
  MaintenancePolicy: () => import('#policies/maintenance_policy'),
  MouillagePolicy: () => import('#policies/mouillage_policy'),
  OrganizationInvitationPolicy: () => import('#policies/organization_invitation_policy'),
  OrganizationPolicy: () => import('#policies/organization_policy'),
  PortPolicy: () => import('#policies/port_policy'),
  SimulatorPolicy: () => import('#policies/simulator_policy'),
  SpotPolicy: () => import('#policies/spot_policy'),
  SubscriptionPolicy: () => import('#policies/subscription_policy'),
}

