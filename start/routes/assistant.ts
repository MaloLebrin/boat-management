import { aiThrottle } from '#start/limiter'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AssistantController = () => import('#controllers/assistant_controller')

/**
 * Copilote FleetAi — panneau de chat global. `start` et `message` déclenchent
 * un appel Mistral synchrone → `aiThrottle` ; confirmation, refus et archivage
 * n'appellent pas le modèle et n'en ont pas besoin.
 */
router
  .group(() => {
    router
      .post('assistant/conversations', [AssistantController, 'start'])
      .as('assistant.start')
      .use(aiThrottle)
    router
      .post('assistant/conversations/:token/messages', [AssistantController, 'message'])
      .as('assistant.message')
      .use(aiThrottle)
    router
      .post('assistant/conversations/:token/action/confirm', [AssistantController, 'confirmAction'])
      .as('assistant.action.confirm')
    router
      .post('assistant/conversations/:token/action/dismiss', [AssistantController, 'dismissAction'])
      .as('assistant.action.dismiss')
    router
      .post('assistant/conversations/:token/archive', [AssistantController, 'archive'])
      .as('assistant.archive')
  })
  .use(middleware.auth())
