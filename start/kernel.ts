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
])

export const middleware = router.named({
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
})
