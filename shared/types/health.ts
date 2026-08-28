/**
 * Sonde de santé `GET /up` (issue #541).
 *
 * Consommée par les probes d'hébergement (healthcheck Docker, Koyeb/Render/Fly,
 * `reverse_proxy` Caddy) — jamais par une page Inertia : c'est une des rares
 * routes qui répond en JSON.
 */
export type HealthStatus = 'ok' | 'error'

/** Détail par dépendance vérifiée — pour l'instant la seule base de données. */
export interface HealthChecks {
  database: HealthStatus
}

/** Corps de la réponse `/up`. `status` vaut `error` dès qu'un check échoue. */
export interface HealthReport {
  status: HealthStatus
  checks: HealthChecks
}
