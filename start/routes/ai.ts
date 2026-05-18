import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.post('ai/chat', [() => import('#controllers/ai_controller'), 'chat']).as('ai.chat')
    router
      .post('ai/fleet-analysis', [() => import('#controllers/ai_controller'), 'fleetAnalysis'])
      .as('ai.fleetAnalysis')
    router
      .post('ai/boats/:id/suggestions', [
        () => import('#controllers/ai_controller'),
        'boatSuggestions',
      ])
      .as('ai.boatSuggestions')
  })
  .use(middleware.auth())
