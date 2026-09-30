export interface WebAppManifestIcon {
  src: string
  sizes: string
  type: 'image/png'
  purpose?: string
}

export interface WebAppManifestShortcut {
  name: string
  short_name: string
  url: string
  icons: WebAppManifestIcon[]
}

export interface WebAppManifestScreenshot {
  src: string
  sizes: string
  type: 'image/png'
  form_factor: 'wide' | 'narrow'
  label: string
}

/** Web App Manifest servi par `GET /site.webmanifest` (#865). */
export interface WebAppManifest {
  id: string
  name: string
  short_name: string
  description: string
  lang: string
  dir: 'ltr'
  start_url: string
  scope: string
  display: 'standalone'
  orientation: 'any'
  theme_color: string
  background_color: string
  categories: Array<'productivity' | 'business'>
  icons: WebAppManifestIcon[]
  shortcuts: WebAppManifestShortcut[]
  screenshots: WebAppManifestScreenshot[]
}
