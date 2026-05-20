import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('ports', [controllers.Ports, 'index']).as('ports.index')
    router.get('ports/new', [controllers.Ports, 'create']).as('ports.create')
    router.post('ports', [controllers.Ports, 'store']).as('ports.store')
    router.get('ports/:id', [controllers.Ports, 'show']).as('ports.show')
    router.get('ports/:id/edit', [controllers.Ports, 'edit']).as('ports.edit')
    router.put('ports/:id', [controllers.Ports, 'update']).as('ports.update')
    router.delete('ports/:id', [controllers.Ports, 'destroy']).as('ports.destroy')

    router
      .post('ports/:portId/pontoons', [controllers.Pontoons, 'store'])
      .as('ports.pontoons.store')
    router
      .put('ports/:portId/pontoons/:pontoonId', [controllers.Pontoons, 'update'])
      .as('ports.pontoons.update')
    router
      .delete('ports/:portId/pontoons/:pontoonId', [controllers.Pontoons, 'destroy'])
      .as('ports.pontoons.destroy')

    router
      .post('ports/:portId/mouillages', [controllers.Mouillages, 'store'])
      .as('ports.mouillages.store')
    router
      .put('ports/:portId/mouillages/:mouillageId', [controllers.Mouillages, 'update'])
      .as('ports.mouillages.update')
    router
      .delete('ports/:portId/mouillages/:mouillageId', [controllers.Mouillages, 'destroy'])
      .as('ports.mouillages.destroy')

    router
      .patch('ports/:portId/pontoons/:pontoonId/position', [controllers.Pontoons, 'updatePosition'])
      .as('ports.pontoons.updatePosition')

    router
      .patch('ports/:portId/mouillages/:mouillageId/position', [
        controllers.Mouillages,
        'updatePosition',
      ])
      .as('ports.mouillages.updatePosition')

    // Spots for pontoons
    router
      .post('ports/:portId/pontoons/:pontoonId/spots', [controllers.Spots, 'storeForPontoon'])
      .as('ports.pontoons.spots.store')

    // Spots for mouillages
    router
      .post('ports/:portId/mouillages/:mouillageId/spots', [controllers.Spots, 'storeForMouillage'])
      .as('ports.mouillages.spots.store')

    // Spots CRUD (update/delete)
    router.put('spots/:id', [controllers.Spots, 'update']).as('spots.update')
    router.delete('spots/:id', [controllers.Spots, 'destroy']).as('spots.destroy')
  })
  .use(middleware.auth())
