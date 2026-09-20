/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'

server.errorHandler(() => import('#exceptions/handler'))

server.use([
  () => import('#middleware/container_bindings_middleware'),
  // Referrer-Policy (#770) — hors Shield, que le kernel retire en test.
  () => import('#middleware/security_headers_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('#middleware/inertia_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('#middleware/large_multipart_upload_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  ...(app.inTest ? [] : [() => import('@adonisjs/shield/shield_middleware')]),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent_auth_middleware'),

  () => import('#middleware/initialize_bouncer_middleware'),
  () => import('#middleware/detect_user_locale_middleware'),
  // #478 — doit rester APRÈS `detect_user_locale_middleware` : la branche
  // d'expiration flashe `ctx.i18n.t('flash.demo.sessionExpired')`, et `ctx.i18n`
  // n'est posé que par ce middleware. Enregistré avant, il levait un
  // `TypeError: Cannot read properties of undefined (reading 't')` → page 500.
  // Il doit aussi rester APRÈS `silent_auth_middleware`, qui hydrate `ctx.auth.user`.
  () => import('#middleware/check_demo_session_middleware'),
  // #763 — révoque les sessions ouvertes avant une réinitialisation de mot de
  // passe. Placé ici pour les mêmes raisons que le middleware ci-dessus : il
  // a besoin de `ctx.auth.user` (posé par `silent_auth_middleware`) et de
  // `ctx.i18n` (posé par `detect_user_locale_middleware`) pour flasher son
  // message avant de rediriger.
  () => import('#middleware/revoked_session_middleware'),
])

export const middleware = router.named({
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
  requirePortsPlan: () => import('#middleware/require_ports_plan_middleware'),
  requireModulePlan: () => import('#middleware/require_module_plan_middleware'),
  // Garde des actions qui engagent des tiers ou de l'argent (#768) : envoi
  // d'e-mail sortant, invitation, paiement. L'app reste ouverte sans
  // vérification — voir `require_verified_email_middleware.ts`.
  requireVerifiedEmail: () => import('#middleware/require_verified_email_middleware'),
})
