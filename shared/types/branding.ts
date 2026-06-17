export interface BrandingSharedProps {
  [key: string]: string | null
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  appName: string | null
}

export interface BrandingConfig extends BrandingSharedProps {
  logoPublicId: string | null
}

export interface BrandingUpdatePayload {
  primaryColor: string | null
  secondaryColor: string | null
  appName: string | null
}

export interface BrandingEmailParams {
  appName: string | null
  primaryColor: string | null
  logoUrl: string | null
}
