import router from '@adonisjs/core/services/router'

const HealthController = () => import('#controllers/health_controller')

/**
 * Probe de santé de l'hébergement (issue #541) : publique (aucun
 * `middleware.auth()`) et sans throttle — les plateformes l'appellent toutes
 * les quelques secondes. Déjà exclue du service worker (`inertia/sw.ts`).
 */
router.get('/up', [HealthController, 'show']).as('health.show')
