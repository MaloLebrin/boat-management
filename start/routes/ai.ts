import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.post('ai/chat', [() => import('#controllers/ai_controller'), 'chat']).as('ai.chat')
  })
  .use(middleware.auth())
