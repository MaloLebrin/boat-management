export const routes = {
  spots: {
    destroy: (id: number) => `/spots/${id}`,
  },
  boats: {
    assignment: (id: number) => `/boats/${id}/assignment`,
  },
  branding: {
    update: () => '/settings/branding',
    logoUpload: () => '/settings/branding/logo',
    logoDelete: () => '/settings/branding/logo',
  },
  csv: {
    importPreview: () => '/settings/import/preview',
    importConfirm: () => '/settings/import/confirm',
    importCancel: () => '/settings/import/cancel',
    exportMaintenance: (boatId: number) => `/boats/${boatId}/export/maintenance.csv`,
    exportFuelLogs: (boatId: number) => `/boats/${boatId}/export/fuel-logs.csv`,
    exportNavigationLogs: (boatId: number) => `/boats/${boatId}/export/navigation-logs.csv`,
  },
}
