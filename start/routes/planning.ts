import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const PlanningController = () => import('#controllers/planning_controller')

router
  .group(() => {
    router.get('planning', [PlanningController, 'index']).as('planning.index')
  })
  .use(middleware.auth())
