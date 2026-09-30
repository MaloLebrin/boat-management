/**
 * Sonde de santé `GET /up` (issue #541).
 *
 * Consommée par les probes d'hébergement (healthcheck Docker, Koyeb/Render/Fly,
 * `reverse_proxy` Caddy) — jamais par une page Inertia : c'est une des rares
 * routes qui répond en JSON.
 */
export type HealthStatus = 'ok' | 'error'

/** Clés VAPID présentes. `missing` ne fait pas échouer la probe (#865). */
export type VapidCheckStatus = 'ok' | 'missing'

/** Détail par dépendance vérifiée. */
export interface HealthChecks {
  database: HealthStatus
  vapid: VapidCheckStatus
}

/** Corps de la réponse `/up`. `status` suit la base ; `checks.vapid` est informatif. */
export interface HealthReport {
  status: HealthStatus
  checks: HealthChecks
}
