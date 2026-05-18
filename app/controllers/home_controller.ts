import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import DashboardService from '#services/dashboard_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  constructor(private dashboardService = new DashboardService()) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.check()

    if (!auth.isAuthenticated) {
      return inertia.render('home', {})
    }

    const user = auth.getUserOrFail()
    const data = await this.dashboardService.getForUser(user)

    const aiService = new AiAnalysisService()
    const latestAnalysis = await aiService.getLatestFleetAnalysis(user.id)
    const aiFleetAnalysis: AiSuggestion[] | null = latestAnalysis
      ? (JSON.parse(latestAnalysis.responseText) as AiSuggestion[])
      : null

    return inertia.render('dashboard', { ...data, aiFleetAnalysis })
  }
}
