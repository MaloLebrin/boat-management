import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import {
  instrumentIngestIpThrottle,
  instrumentIngestThrottle,
  instrumentPairingCreateThrottle,
  instrumentPairingPollThrottle,
} from '#start/limiter'

const InstrumentIngestController = () => import('#controllers/instrument_ingest_controller')
const InstrumentPairingApiController = () =>
  import('#controllers/instrument_pairing_api_controller')

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

// Appairage par code du boîtier (#1032) : le plugin n'a encore aucun jeton, donc
// aucune authentification — la sécurité tient au `deviceCode` (256 bits) et aux
// limiteurs par IP. Un compteur par route : l'interrogation, fréquente, ne doit
// pas consommer le budget de création.
router
  .group(() => {
    router
      .post('instruments/pairing', [InstrumentPairingApiController, 'store'])
      .as('api.instruments.pairing.store')
      .use(instrumentPairingCreateThrottle)
    router
      .post('instruments/pairing/poll', [InstrumentPairingApiController, 'poll'])
      .as('api.instruments.pairing.poll')
      .use(instrumentPairingPollThrottle)
  })
  .prefix('/api')
