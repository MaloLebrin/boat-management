import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('boats', [controllers.Boats, 'index']).as('boats.index')
    router.get('boats/new', [controllers.Boats, 'create']).as('boats.create')
    router.post('boats', [controllers.Boats, 'store']).as('boats.store')
    router.get('boats/:id', [controllers.Boats, 'show']).as('boats.show')
    router.get('boats/:id/edit', [controllers.Boats, 'edit']).as('boats.edit')
    router.put('boats/:id', [controllers.Boats, 'update']).as('boats.update')
    router.delete('boats/:id', [controllers.Boats, 'destroy']).as('boats.destroy')
    router.post('boats/:boatId/maintenance', [controllers.BoatMaintenances, 'store'])
    router.delete('boats/:boatId/maintenance/:eventId', [controllers.BoatMaintenances, 'destroy'])
  })
  .use(middleware.auth())
