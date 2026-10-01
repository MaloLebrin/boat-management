import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PwaManifestService from '#services/pwa_manifest_service'

@inject()
export default class PwaManifestController {
  constructor(private pwaManifestService: PwaManifestService) {}

  /**
   * `GET /site.webmanifest` — manifeste PWA selon la locale de la requête (#865).
   * JSON assumé : le navigateur le charge via `<link rel="manifest">`, pas Inertia.
   */
  async show({ response, i18n }: HttpContext) {
    response.header('Content-Type', 'application/manifest+json; charset=utf-8')
    response.header('Cache-Control', 'public, max-age=3600')

    return response.send(JSON.stringify(this.pwaManifestService.build(i18n)))
  }
}
