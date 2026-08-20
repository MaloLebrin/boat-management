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
