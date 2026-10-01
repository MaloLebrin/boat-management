import router from '@adonisjs/core/services/router'

const PwaManifestController = () => import('#controllers/pwa_manifest_controller')

router.get('/site.webmanifest', [PwaManifestController, 'show']).as('pwa.manifest')
