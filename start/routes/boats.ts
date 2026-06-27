import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

const CsvExportController = () => import('#controllers/csv_export_controller')
const BudgetController = () => import('#controllers/budget_controller')
const BoatPortStayController = () => import('#controllers/boat_port_stay_controller')
const BoatBudgetEntryController = () => import('#controllers/boat_budget_entry_controller')
const BoatReservationsController = () => import('#controllers/boat_reservations_controller')

router
  .group(() => {
    router.get('boats', [controllers.Boats, 'index']).as('boats.index')
    router.get('boats/new', [controllers.Boats, 'create']).as('boats.create')
    router.post('boats', [controllers.Boats, 'store']).as('boats.store')
    router.get('boats/:id', [controllers.Boats, 'show']).as('boats.show')
    router.get('boats/:id/navigation', [controllers.Boats, 'navigation']).as('boats.navigation')
    router
      .get('boats/:id/maintenance-log.pdf', [controllers.MaintenanceLogPdf, 'download'])
      .as('boats.maintenanceLog.download')
    router
      .get('boats/:id/export/maintenance.csv', [CsvExportController, 'maintenance'])
      .as('boats.export.maintenance')
    router
      .get('boats/:id/export/fuel-logs.csv', [CsvExportController, 'fuelLogs'])
      .as('boats.export.fuelLogs')
    router
      .get('boats/:id/export/navigation-logs.csv', [CsvExportController, 'navigationLogs'])
      .as('boats.export.navigationLogs')
    router
      .get('boats/:id/export/budget.csv', [CsvExportController, 'budget'])
      .as('boats.export.budget')
    router.get('boats/:id/budget', [BudgetController, 'show']).as('boats.budget')
    router
      .post('boats/:id/port-stays', [BoatPortStayController, 'store'])
      .as('boats.portStays.store')
    router
      .delete('boats/:id/port-stays/:stayId', [BoatPortStayController, 'destroy'])
      .as('boats.portStays.destroy')
    router
      .post('boats/:id/budget/entries', [BoatBudgetEntryController, 'store'])
      .as('boats.budget.entries.store')
    router
      .delete('boats/:id/budget/entries/:entryId', [BoatBudgetEntryController, 'destroy'])
      .as('boats.budget.entries.destroy')
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

    router.post('boats/:boatId/generic-equipment', [controllers.BoatGenericEquipment, 'store'])
    router.put('boats/:boatId/generic-equipment/:itemId', [
      controllers.BoatGenericEquipment,
      'update',
    ])
    router.delete('boats/:boatId/generic-equipment/:itemId', [
      controllers.BoatGenericEquipment,
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

    router
      .post('boats/:boatId/incidents', [controllers.BoatIncidents, 'store'])
      .as('boats.incidents.store')
    router
      .put('boats/:boatId/incidents/:incidentId', [controllers.BoatIncidents, 'update'])
      .as('boats.incidents.update')
    router
      .delete('boats/:boatId/incidents/:incidentId', [controllers.BoatIncidents, 'destroy'])
      .as('boats.incidents.destroy')

    router.get('boats/:id/simulator', [controllers.BoatSimulator, 'show']).as('boats.simulator')

    router
      .post('boats/:boatId/fuel-logs', [controllers.BoatFuelLogs, 'store'])
      .as('boats.fuelLogs.store')
    router
      .delete('boats/:boatId/fuel-logs/:logId', [controllers.BoatFuelLogs, 'destroy'])
      .as('boats.fuelLogs.destroy')

    router
      .post('boats/:boatId/navigation-logs', [controllers.NavigationLogs, 'store'])
      .as('boats.navigationLogs.store')
    router
      .patch('boats/:boatId/navigation-logs/:logId', [controllers.NavigationLogs, 'update'])
      .as('boats.navigationLogs.update')
    router
      .patch('boats/:boatId/navigation-logs/:logId/close', [controllers.NavigationLogs, 'close'])
      .as('boats.navigationLogs.close')
    router
      .delete('boats/:boatId/navigation-logs/:logId', [controllers.NavigationLogs, 'destroy'])
      .as('boats.navigationLogs.destroy')
    router
      .patch('boats/:boatId/navigation-logs/:logId/crew', [controllers.NavigationLogCrew, 'sync'])
      .as('boats.navigationLogs.crew.sync')
    router
      .get('boats/:boatId/navigation-logs/:logId/crew-role.pdf', [
        controllers.CrewRolePdf,
        'download',
      ])
      .as('boats.navigationLogs.crewRole.download')

    router
      .post('boats/:boatId/admin-documents', [controllers.BoatDocuments, 'store'])
      .as('boats.adminDocuments.store')
    router
      .put('boats/:boatId/admin-documents/:documentId', [controllers.BoatDocuments, 'update'])
      .as('boats.adminDocuments.update')
    router
      .delete('boats/:boatId/admin-documents/:documentId', [controllers.BoatDocuments, 'destroy'])
      .as('boats.adminDocuments.destroy')

    router
      .post('boats/:boatId/position', [controllers.BoatPosition, 'store'])
      .as('boats.position.store')

    router
      .get('boats/:boatId/reservations', [BoatReservationsController, 'index'])
      .as('boats.reservations.index')
    router
      .post('boats/:boatId/reservations', [BoatReservationsController, 'store'])
      .as('boats.reservations.store')
    router
      .patch('boats/:boatId/reservations/:reservationId', [BoatReservationsController, 'update'])
      .as('boats.reservations.update')
    router
      .delete('boats/:boatId/reservations/:reservationId', [BoatReservationsController, 'destroy'])
      .as('boats.reservations.destroy')
  })
  .use(middleware.auth())
