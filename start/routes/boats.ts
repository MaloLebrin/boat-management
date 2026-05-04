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

    router.post('boats/:boatId/engines', [controllers.BoatEquipment, 'storeEngine'])
    router
      .get('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'showEngine'])
      .as('boats.engines.show')
    router.get('boats/:boatId/engines/:engineId/edit', [controllers.BoatEquipment, 'editEngine'])
    router.put('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'updateEngine'])
    router.delete('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'destroyEngine'])

    router.post('boats/:boatId/sails', [controllers.BoatEquipment, 'storeSail'])
    router.get('boats/:boatId/sails/:sailId/edit', [controllers.BoatEquipment, 'editSail'])
    router.put('boats/:boatId/sails/:sailId', [controllers.BoatEquipment, 'updateSail'])
    router.delete('boats/:boatId/sails/:sailId', [controllers.BoatEquipment, 'destroySail'])

    router.get('boats/:boatId/rig/edit', [controllers.BoatEquipment, 'editRig'])
    router.put('boats/:boatId/rig', [controllers.BoatEquipment, 'upsertRig'])
    router.delete('boats/:boatId/rig', [controllers.BoatEquipment, 'destroyRig'])

    router.post('boats/:boatId/maintenance', [controllers.BoatMaintenances, 'store'])
    router.delete('boats/:boatId/maintenance/:eventId', [controllers.BoatMaintenances, 'destroy'])

    router
      .post('boats/:boatId/maintenance-tasks', [controllers.BoatMaintenanceTasks, 'store'])
      .as('boats.maintenanceTasks.store')
    router
      .put('boats/:boatId/maintenance-tasks/:taskId/done', [
        controllers.BoatMaintenanceTasks,
        'markDone',
      ])
      .as('boats.maintenanceTasks.done')
    router
      .delete('boats/:boatId/maintenance-tasks/:taskId', [
        controllers.BoatMaintenanceTasks,
        'destroy',
      ])
      .as('boats.maintenanceTasks.destroy')
  })
  .use(middleware.auth())
