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
  })
  .use(middleware.auth())
