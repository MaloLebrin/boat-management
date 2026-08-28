import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HealthService from '#services/health_service'

@inject()
export default class HealthController {
  constructor(private healthService: HealthService) {}

  /**
   * `GET /up` — 200 si l'app est saine, 503 sinon (issue #541).
   *
   * Réponse JSON assumée : la route n'est pas un écran Inertia mais une probe
   * consommée par Docker et les PaaS.
   */
  async show({ response }: HttpContext) {
    const report = await this.healthService.check()

    return response.status(report.status === 'ok' ? 200 : 503).json(report)
  }
}
