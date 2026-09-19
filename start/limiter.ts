import limiter from '@adonisjs/limiter/services/main'

/**
 * Les trois POST d'authentification ont chacun **leur** compteur (#767).
 *
 * Ils partageaient `authThrottle` : un utilisateur qui se trompait plusieurs
 * fois de mot de passe consommait le budget qui lui aurait permis de demander
 * un lien de réinitialisation — c'est-à-dire de se sortir d'affaire.
 *
 * Tous trois explicitent en plus leur clé. `authThrottle` était le seul
 * limiteur du fichier à ne pas le faire, et retombait sur la clé par défaut.
 */
export const loginThrottle = limiter.define('login_ip', (ctx) => {
  return limiter.allowRequests(10).every('1 minute').usingKey(`login_ip_${ctx.request.ip()}`)
})

export const forgotPasswordThrottle = limiter.define('forgot_password', (ctx) => {
  return limiter.allowRequests(10).every('1 minute').usingKey(`forgot_pwd_${ctx.request.ip()}`)
})

export const resetPasswordThrottle = limiter.define('reset_password', (ctx) => {
  return limiter.allowRequests(10).every('1 minute').usingKey(`reset_pwd_${ctx.request.ip()}`)
})

/**
 * Compteur de connexion **par compte** (#767).
 *
 * Le bornage par IP ne couvre pas le credential stuffing distribué : 10
 * tentatives/minute/IP, mais depuis 200 IP résidentielles cela fait 2 000
 * tentatives/minute sur la même adresse, et le compteur de la victime
 * n'existait pas.
 *
 * Il n'est pas monté en middleware de route mais consommé dans
 * `SessionController.store` via `penalize()`, ce qui change tout :
 *
 * - seules les tentatives **en échec** décomptent — un utilisateur qui se
 *   connecte dix fois dans l'heure depuis plusieurs appareils n'est pas puni ;
 * - une connexion réussie **remet le compteur à zéro** ;
 * - au-delà du plafond, les identifiants ne sont même plus vérifiés.
 *
 * Fenêtre à l'heure : c'est la durée qui rend le stuffing distribué coûteux,
 * là où une fenêtre à la minute se contourne en ralentissant.
 */
export const LOGIN_ACCOUNT_LIMIT = { requests: 10, duration: '1 hour' } as const

export function loginAccountLimiter() {
  return limiter.use(LOGIN_ACCOUNT_LIMIT)
}

/**
 * Clé du compteur par compte.
 *
 * Normalisée comme le fait `User.normalizeEmail` (`app/models/user.ts`) :
 * sans ça, changer la casse de l'adresse suffirait à repartir d'un compteur
 * vierge.
 */
export function loginAccountKey(email: string): string {
  return `login_account_${email.trim().toLowerCase()}`
}

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
