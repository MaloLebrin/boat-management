import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const InstrumentSourcesController = () => import('#controllers/instrument_sources_controller')
const InstrumentAlertRulesController = () =>
  import('#controllers/instrument_alert_rules_controller')
const InstrumentIngestTokensController = () =>
  import('#controllers/instrument_ingest_tokens_controller')
const BoatTelemetryController = () => import('#controllers/boat_telemetry_controller')

// Instruments de bord via Signal K (#988) — plans Pro et Entreprise
// (`canConnectInstruments`, D7). La lecture passe par la prop différée
// `instruments` de `boats.show` ; ici, les mutations seulement.
router
  .group(() => {
    router
      .put('boats/:boatId/instrument-source', [InstrumentSourcesController, 'upsert'])
      .as('boats.instrumentSource.upsert')
    router
      .delete('boats/:boatId/instrument-source', [InstrumentSourcesController, 'destroy'])
      .as('boats.instrumentSource.destroy')
    router
      .post('boats/:boatId/instrument-alert-rules', [InstrumentAlertRulesController, 'store'])
      .as('boats.instrumentAlertRules.store')
    router
      .put('boats/:boatId/instrument-alert-rules/:ruleId', [
        InstrumentAlertRulesController,
        'update',
      ])
      .as('boats.instrumentAlertRules.update')
    router
      .delete('boats/:boatId/instrument-alert-rules/:ruleId', [
        InstrumentAlertRulesController,
        'destroy',
      ])
      .as('boats.instrumentAlertRules.destroy')
    router
      .post('boats/:boatId/instrument-source/ingest-token', [
        InstrumentIngestTokensController,
        'store',
      ])
      .as('boats.instrumentIngestToken.store')
    router
      .delete('boats/:boatId/instrument-source/ingest-token', [
        InstrumentIngestTokensController,
        'destroy',
      ])
      .as('boats.instrumentIngestToken.destroy')
    router
      .post('boats/:boatId/telemetry', [BoatTelemetryController, 'store'])
      .as('boats.telemetry.store')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'instruments' })])
