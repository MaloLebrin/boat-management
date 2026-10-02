import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const BoatOwnerPortalController = () => import('#controllers/boat_owner_portal_controller')

router
  .group(() => {
    router.get('owner/boats', [BoatOwnerPortalController, 'index']).as('owner.boats.index')
    router.get('owner/boats/:id', [BoatOwnerPortalController, 'show']).as('owner.boats.show')
    // Interactions du propriétaire (#890) — chaque action résout le bateau par
    // le pivot `boat_owners` : jamais la flotte, seulement ses bateaux.
    router
      .post('owner/boats/:id/requests', [BoatOwnerPortalController, 'storeRequest'])
      .as('owner.boats.requests.store')
    router
      .post('owner/boats/:id/tasks/:taskId/approve', [BoatOwnerPortalController, 'approve'])
      .as('owner.boats.tasks.approve')
    router
      .post('owner/boats/:id/tasks/:taskId/reject', [BoatOwnerPortalController, 'reject'])
      .as('owner.boats.tasks.reject')
  })
  .use(middleware.auth())
