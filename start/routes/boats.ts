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

    router.patch('boats/:id/assignment', [controllers.Boats, 'assign']).as('boats.assign')

    router.post('boats/:boatId/engines', [controllers.BoatEquipment, 'storeEngine'])
    router
      .get('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'showEngine'])
      .as('boats.engines.show')
    router.get('boats/:boatId/engines/:engineId/edit', [controllers.BoatEquipment, 'editEngine'])
    router.put('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'updateEngine'])
    router.patch('boats/:boatId/engines/:engineId/status', [
      controllers.BoatEquipment,
      'updateEngineStatus',
    ])
    router.patch('boats/:boatId/engines/:engineId/notes', [
      controllers.BoatEquipment,
      'updateEngineNotes',
    ])
    router.delete('boats/:boatId/engines/:engineId', [controllers.BoatEquipment, 'destroyEngine'])

    router.post('boats/:boatId/engines/:engineId/documents', [
      controllers.BoatMedia,
      'storeEngineDocument',
    ])
    router.delete('boats/:boatId/engines/:engineId/media/:mediaId', [
      controllers.BoatMedia,
      'destroyEngineMedia',
    ])

    router.post('boats/:boatId/engines/:engineId/parts', [controllers.BoatEngineParts, 'store'])
    router
      .get('boats/:boatId/engines/:engineId/parts/:partId', [controllers.BoatEngineParts, 'show'])
      .as('boats.engines.parts.show')
    router.put('boats/:boatId/engines/:engineId/parts/:partId', [
      controllers.BoatEngineParts,
      'update',
    ])
    router.delete('boats/:boatId/engines/:engineId/parts/:partId', [
      controllers.BoatEngineParts,
      'destroy',
    ])
    router.post('boats/:boatId/engines/:engineId/parts/:partId/documents', [
      controllers.BoatEngineParts,
      'storeDocument',
    ])
    router.delete('boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId', [
      controllers.BoatEngineParts,
      'destroyMedia',
    ])
    router.get('boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download', [
      controllers.BoatEngineParts,
      'downloadMedia',
    ])

    router.get('boats/:boatId/media/:mediaId/download', [controllers.BoatMedia, 'downloadMedia'])
    router.get('boats/:boatId/engines/:engineId/media/:mediaId/download', [
      controllers.BoatMedia,
      'downloadEngineMedia',
    ])

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

    router.post('boats/:boatId/photos', [controllers.BoatMedia, 'storePhoto'])
    router.post('boats/:boatId/documents', [controllers.BoatMedia, 'storeDocument'])
    router.delete('boats/:boatId/media/:mediaId', [controllers.BoatMedia, 'destroy'])

    router.post('boats/:boatId/safety-equipment', [controllers.BoatSafetyEquipment, 'store'])
    router.put('boats/:boatId/safety-equipment/:itemId', [
      controllers.BoatSafetyEquipment,
      'update',
    ])
    router.delete('boats/:boatId/safety-equipment/:itemId', [
      controllers.BoatSafetyEquipment,
      'destroy',
    ])

    router
      .post('boats/:boatId/maintenance-sheets', [controllers.BoatMaintenanceSheets, 'store'])
      .as('boats.maintenanceSheets.store')
    router
      .put('boats/:boatId/maintenance-sheets/:sheetId/complete', [
        controllers.BoatMaintenanceSheets,
        'complete',
      ])
      .as('boats.maintenanceSheets.complete')
    router
      .delete('boats/:boatId/maintenance-sheets/:sheetId', [
        controllers.BoatMaintenanceSheets,
        'destroy',
      ])
      .as('boats.maintenanceSheets.destroy')
    router
      .put('boats/:boatId/maintenance-sheets/:sheetId/items/:itemId', [
        controllers.BoatMaintenanceSheetItems,
        'update',
      ])
      .as('boats.maintenanceSheetItems.update')

    router.get('boats/:id/simulator', [controllers.BoatSimulator, 'show']).as('boats.simulator')
  })
  .use(middleware.auth())
