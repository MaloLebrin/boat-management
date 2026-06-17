export const routes = {
  spots: {
    destroy: (id: number) => `/spots/${id}`,
  },
  branding: {
    update: () => '/settings/branding',
    logoUpload: () => '/settings/branding/logo',
    logoDelete: () => '/settings/branding/logo',
  },
}
