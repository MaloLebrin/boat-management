import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const EnginesController = () => import('#controllers/engines_controller')

router
  .group(() => {
    // Inventaire moteur transverse (#598) — les routes moteur rattachées à un
    // bateau restent dans `start/routes/boats.ts`.
    router.get('engines', [EnginesController, 'index']).as('engines.index')
  })
  .use(middleware.auth())
