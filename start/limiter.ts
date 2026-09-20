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

// Les trois POST publics du simulateur (#731) : aucune authentification, et
// chacun écrit en base. Compteurs séparés — une rafale sur l'un ne doit pas
// consommer le budget des autres.
//
// `session` et `share` reprennent le débit du diagnostic public (6/min) : ils
// n'écrivent qu'une ligne, mais rien ne les borne côté client.
export const simulatorSessionThrottle = limiter.define('simulator_session', (ctx) => {
  return limiter
    .allowRequests(6)
    .every('1 minute')
    .usingKey(`simulator_session_${ctx.request.ip()}`)
})

export const simulatorShareThrottle = limiter.define('simulator_share', (ctx) => {
  return limiter.allowRequests(6).every('1 minute').usingKey(`simulator_share_${ctx.request.ip()}`)
})

// `lead` est le plus exposé des trois : il crée un prospect **et** déclenche
// deux jobs d'e-mail (`send_simulator_report_job`, `send_simulator_nurturing_job`).
// Même budget que le formulaire de contact — l'autre formulaire public qui
// envoie du courrier — et non celui des deux routes ci-dessus.
export const simulatorLeadThrottle = limiter.define('simulator_lead', (ctx) => {
  return limiter.allowRequests(5).every('10 minutes').usingKey(`simulator_lead_${ctx.request.ip()}`)
})

// Abonnements Web Push (#497) : le navigateur ne (ré)abonne qu'à l'activation
// ou au chargement — au-delà, c'est un script.
export const pushThrottle = limiter.define('push', (ctx) => {
  return limiter.allowRequests(20).every('1 minute').usingKey(`push_${ctx.request.ip()}`)
})

// Renvoi du lien de vérification (#768) : chaque appel envoie un e-mail
// sortant. Même budget que le formulaire de contact — l'autre route de l'app
// qui met du courrier en file sur demande d'un humain.
export const emailVerificationResendThrottle = limiter.define(
  'email_verification_resend',
  (ctx) => {
    return limiter
      .allowRequests(5)
      .every('10 minutes')
      .usingKey(`email_verification_${ctx.auth.user?.id ?? ctx.request.ip()}`)
  }
)

// Switchers de langue et de thème (#783) : les deux dernières routes publiques
// d'écriture du repo à n'avoir aucun limiteur. Chacune déclenche un `UPDATE`
// sur `users` dès qu'une session existe, donc un script peut les marteler.
//
// Le débit est volontairement généreux : basculer plusieurs fois de thème
// d'affilée pour comparer est un geste légitime, et ces routes sont servies
// sur le marketing et l'écran de login, où plusieurs visiteurs peuvent
// partager une IP.
export const preferencesThrottle = limiter.define('preferences', (ctx) => {
  return limiter.allowRequests(30).every('1 minute').usingKey(`preferences_${ctx.request.ip()}`)
})
