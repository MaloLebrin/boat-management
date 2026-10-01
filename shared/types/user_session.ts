/** Navigateur et système lus dans le user-agent (#885). `null` = non reconnu. */
export interface DeviceInfo {
  browser: string | null
  os: string | null
}

/** Une session active de l'utilisateur, telle que listée dans `/settings/me` (#885). */
export interface UserSessionRow {
  id: string
  device: DeviceInfo
  ipAddress: string | null
  createdAt: string
  lastSeenAt: string
  /** La session qui affiche la page — pas de bouton « Déconnecter ». */
  isCurrent: boolean
  /** Un remember-me rouvrira la session après son expiration. */
  remembered: boolean
}

export interface UserSessionsSettingsProps {
  sessions: UserSessionRow[]
  /**
   * Remember-me encore valides mais rattachés à aucune session listée
   * (émis avant le registre) : révocables d'un bloc.
   */
  orphanRememberedCount: number
  notifyNewLogin: boolean
}

/** Contexte de requête enregistré avec une session. */
export interface SessionRequestInfo {
  ipAddress: string | null
  userAgent: string | null
}

/** Résultat du contrôle d'une session à chaque requête. */
export type SessionRecordStatus = 'active' | 'revoked'
