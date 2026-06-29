import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BudgetService from '#services/budget_service'
import BoatPortStayService from '#services/boat_port_stay_service'
import BoatBudgetEntryService from '#services/boat_budget_entry_service'
import { toBudgetEntryItem, toPortStayItem } from '#transformers/budget_transformer'
import BoatPolicy from '#policies/boat_policy'
import { budgetYearValidator } from '#validators/budget_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BudgetController {
  constructor(
    private boatService: BoatService,
    private budgetService: BudgetService,
    private portStayService: BoatPortStayService,
    private entryService: BoatBudgetEntryService
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

    const [budget, portStays, entries, canManage] = await Promise.all([
      this.budgetService.getForBoat(boat, year),
      this.portStayService.listForBoat(boat, year),
      this.entryService.listForBoat(boat, year),
      bouncer.with(BoatPolicy).allows('manage', boat),
    ])

    const portStaysFormatted = portStays.map(toPortStayItem)
    const entriesFormatted = entries.map(toBudgetEntryItem)

    return inertia.render('boats/budget', {
      boat: { id: boat.id, name: boat.name },
      budget,
      year,
      portStays: portStaysFormatted,
      entries: entriesFormatted,
      canManage,
    })
  }
}
