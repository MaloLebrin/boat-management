import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const BoatEngineDiagnosticController = () =>
  import('#controllers/boat_engine_diagnostic_controller')

router
  .group(() => {
    router.get('diagnostic', [BoatEngineDiagnosticController, 'index']).as('diagnostic.index')
    router
      .get('diagnostic/first-contact', [BoatEngineDiagnosticController, 'firstContact'])
      .as('diagnostic.firstContact')

    router
      .get('boats/:boatId/engines/:engineId/diagnostic', [
        BoatEngineDiagnosticController,
        'checklist',
      ])
      .as('diagnostic.checklist')
    router
      .get('boats/:boatId/engines/:engineId/diagnostic/sheets/:sheetSlug', [
        BoatEngineDiagnosticController,
        'sheet',
      ])
      .where('sheetSlug', /^[a-z-]+$/)
      .as('diagnostic.sheet')

    router
      .patch('boats/:boatId/engines/:engineId/diagnostic/steps', [
        BoatEngineDiagnosticController,
        'toggleStep',
      ])
      .as('diagnostic.steps.toggle')
    router
      .delete('boats/:boatId/engines/:engineId/diagnostic/checks', [
        BoatEngineDiagnosticController,
        'reset',
      ])
      .as('diagnostic.reset')
  })
  .use(middleware.auth())
