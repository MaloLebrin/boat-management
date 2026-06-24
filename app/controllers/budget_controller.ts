import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BudgetService from '#services/budget_service'
import BoatPolicy from '#policies/boat_policy'
import { budgetYearValidator } from '#validators/budget_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BudgetController {
  constructor(
    private boatService: BoatService,
    private budgetService: BudgetService
  ) {}

  async show({ params, inertia, auth, bouncer, response, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const { year: rawYear } = await request.validateUsing(budgetYearValidator)
    const year = rawYear ?? new Date().getFullYear()
    const budget = await this.budgetService.getForBoat(boat, year)

    return inertia.render('boats/budget', {
      boat: { id: boat.id, name: boat.name },
      budget,
      year,
    })
  }
}
