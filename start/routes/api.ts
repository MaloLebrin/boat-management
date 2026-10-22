import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { instrumentIngestIpThrottle, instrumentIngestThrottle } from '#start/limiter'

const InstrumentIngestController = () => import('#controllers/instrument_ingest_controller')

// API machine-à-machine (JSON, sans session ni CSRF : `config/shield.ts`
// `exceptRoutes`). Le Service Worker exclut déjà `/api/`.
//
// Plugin Signal K (#994) : lot de télémétrie authentifié par le jeton de la
// source. Ordre : limiteur par IP (devinette de jeton) → jeton → limiteur par
// source. Le plan Pro/Entreprise est vérifié par le middleware de jeton, la
// route n'ayant pas d'utilisateur à qui appliquer `requireModulePlan`.
router
  .group(() => {
    router
      .post('instruments/ingest', [InstrumentIngestController, 'store'])
      .as('api.instruments.ingest')
  })
  .prefix('/api')
  .use([instrumentIngestIpThrottle, middleware.instrumentIngestToken(), instrumentIngestThrottle])
