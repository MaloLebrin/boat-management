import limiter from '@adonisjs/limiter/services/main'

export const authThrottle = limiter.define('auth', () => {
  return limiter.allowRequests(10).every('1 minute')
})

export const aiThrottle = limiter.define('ai', (ctx) => {
  return limiter
    .allowRequests(20)
    .every('1 minute')
    .usingKey(`ai_${ctx.auth.user?.id ?? ctx.request.ip()}`)
})

export const demoThrottle = limiter.define('demo', (ctx) => {
  return limiter.allowRequests(5).every('1 minute').usingKey(`demo_${ctx.request.ip()}`)
})

// Formulaire de contact public (#450) : borne les envois pour éviter le spam.
export const contactThrottle = limiter.define('contact', (ctx) => {
  return limiter.allowRequests(5).every('10 minutes').usingKey(`contact_${ctx.request.ip()}`)
})

// Chat IA public de diagnostic (#602) : endpoint anonyme dont chaque requête
// déclenche un appel Mistral synchrone — plus strict que `aiThrottle`.
export const publicDiagnosisThrottle = limiter.define('public_diagnosis', (ctx) => {
  return limiter
    .allowRequests(6)
    .every('1 minute')
    .usingKey(`public_diag_${ctx.auth.user?.id ?? ctx.request.ip()}`)
})

// Chat IA public de recherche de références de pièces (#634, Phase 2) : même
// contrainte que le diagnostic public, avec son propre compteur — les deux
// features ne doivent pas se voler leur budget de requêtes.
export const publicPartSearchThrottle = limiter.define('public_part_search', (ctx) => {
  return limiter
    .allowRequests(6)
    .every('1 minute')
    .usingKey(`public_parts_${ctx.auth.user?.id ?? ctx.request.ip()}`)
})

// Abonnements Web Push (#497) : le navigateur ne (ré)abonne qu'à l'activation
// ou au chargement — au-delà, c'est un script.
export const pushThrottle = limiter.define('push', (ctx) => {
  return limiter.allowRequests(20).every('1 minute').usingKey(`push_${ctx.request.ip()}`)
})
