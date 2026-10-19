import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const InstrumentSourcesController = () => import('#controllers/instrument_sources_controller')
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
      .post('boats/:boatId/telemetry', [BoatTelemetryController, 'store'])
      .as('boats.telemetry.store')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'instruments' })])
