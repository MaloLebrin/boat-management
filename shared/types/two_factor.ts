/**
 * Double authentification TOTP (#884).
 */

/** Second facteur accepté au login : code de l'appli, ou code de secours. */
export type TwoFactorMethod = 'totp' | 'recovery'

/** Changement notifié par e-mail à l'utilisateur. */
export const TWO_FACTOR_EVENTS = [
  'enabled',
  'disabled',
  'recovery_used',
  'recovery_regenerated',
] as const
export type TwoFactorEvent = (typeof TWO_FACTOR_EVENTS)[number]

/** Activation en cours : secret en clair et QR code, montrés à son seul titulaire. */
export interface TwoFactorSetupData {
  secret: string
  otpauthUri: string
  /** SVG en data-URI — la CSP autorise `data:` en `imgSrc`. */
  qrCodeDataUri: string
}

/** Section « Double authentification » de `/settings/me`. */
export interface TwoFactorSettingsProps {
  enabled: boolean
  recoveryCodesRemaining: number
  pendingSetup: TwoFactorSetupData | null
  /** Codes de secours en clair, présents une seule fois après génération. */
  recoveryCodes: string[] | null
  requiredByOrganization: boolean
  /** Fin du délai de grâce de la politique d'organisation (ISO), si imposée. */
  graceEndsAt: string | null
}

/** État « pré-authentifié » posé en session entre le mot de passe et le code. */
export interface TwoFactorPendingChallenge {
  userId: number
  remember: boolean
  /** ISO. */
  expiresAt: string
}

/** Politique d'organisation, éditée dans `/settings/org`. */
export interface OrganizationTwoFactorPolicy {
  requireTwoFactor: boolean
  /** ISO, `null` = pas de délai de grâce (ou politique inactive). */
  graceEndsAt: string | null
  membersWithoutTwoFactor: number
}

/** Ce que la politique impose à un utilisateur à l'instant présent. */
export interface TwoFactorEnforcement {
  required: boolean
  graceEndsAt: string | null
  /** Politique active, utilisateur sans 2FA, délai de grâce écoulé. */
  blocked: boolean
}
