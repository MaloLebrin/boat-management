import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const BoatOwnerPortalController = () => import('#controllers/boat_owner_portal_controller')

router
  .group(() => {
    router.get('owner/boats', [BoatOwnerPortalController, 'index']).as('owner.boats.index')
    router.get('owner/boats/:id', [BoatOwnerPortalController, 'show']).as('owner.boats.show')
  })
  .use(middleware.auth())
