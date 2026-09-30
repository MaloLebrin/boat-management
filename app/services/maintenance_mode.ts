import { existsSync } from 'node:fs'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import en from '../../resources/lang/en/errors.json' with { type: 'json' }
import fr from '../../resources/lang/fr/errors.json' with { type: 'json' }

/**
 * Secondes annoncées dans `Retry-After` pendant une maintenance (#864).
 * Cinq minutes : le message dit « quelques minutes », les clients (navigateurs,
 * Stripe) réessaient après ce délai.
 */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 300

/** Fichier lu à chaque requête : le poser ou le retirer ne demande pas de redémarrage. */
export function maintenanceFlagPath(): string {
  return app.tmpPath('maintenance')
}

/**
 * Vrai si l'une des deux bascules est armée. Les deux arguments sont injectés
 * pour que le test unitaire n'ait pas à toucher le process ni le disque.
 */
export function isMaintenanceEnabled(envEnabled: boolean, flagExists: boolean): boolean {
  return envEnabled || flagExists
}

/**
 * Bascule lue par le middleware. Échangeable dans les tests via
 * `app.container.swap(MaintenanceMode, …)` — un fichier réel dans `tmp/`
 * fermerait toutes les routes des autres fichiers de test lancés en parallèle.
 */
export default class MaintenanceMode {
  isEnabled(): boolean {
    return isMaintenanceEnabled(
      env.get('MAINTENANCE_MODE') === true,
      existsSync(maintenanceFlagPath())
    )
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * HTML autonome, calqué sur `public/offline.html`.
 *
 * Pas de rendu Inertia : `share()` lit l'utilisateur, l'organisation et les
 * notifications. Si la base est la cause de la maintenance, cette lecture
 * échoue et le visiteur verrait une 500. Les deux locales sont dans la page :
 * le middleware tourne avant la détection de langue.
 */
export function renderMaintenancePage(): string {
  const title = `${escapeHtml(en.maintenance.title)} / ${escapeHtml(fr.maintenance.title)}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — FleetAi</title>
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
        color: #1e293b;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100dvh;
        padding: 1.5rem;
      }
      .card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 2.5rem 2rem;
        max-width: 32rem;
        width: 100%;
        text-align: center;
      }
      h1 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      p {
        color: #64748b;
        font-size: 0.9375rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }
      button {
        background: #0b1d2e;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        padding: 0.625rem 1.25rem;
        font-size: 0.9375rem;
        font-weight: 500;
        cursor: pointer;
      }
      button:hover {
        background: #102a40;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>
        ${escapeHtml(en.maintenance.title)}<br />
        ${escapeHtml(fr.maintenance.title)}
      </h1>
      <p>
        ${escapeHtml(en.maintenance.description)}<br /><br />
        ${escapeHtml(fr.maintenance.description)}
      </p>
      <button type="button" onclick="window.location.reload()">
        ${escapeHtml(en.maintenance.action)} / ${escapeHtml(fr.maintenance.action)}
      </button>
    </div>
  </body>
</html>`
}
