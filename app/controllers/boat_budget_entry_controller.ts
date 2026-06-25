import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BoatBudgetEntryService from '#services/boat_budget_entry_service'
import BoatPolicy from '#policies/boat_policy'
import { budgetEntryValidator } from '#validators/budget_entry_validator'

@inject()
export default class BoatBudgetEntryController {
  constructor(
    private boatService: BoatService,
    private entryService: BoatBudgetEntryService
  ) {}

  async store({ params, request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const body = await request.validateUsing(budgetEntryValidator)
    await this.entryService.create(boat, {
      amount: body.amount,
      date: body.date,
      label: body.label,
      category: body.category ?? null,
      description: body.description ?? null,
    })

    session.flash('success', i18n.t('flash.budgetEntry.created'))
    return response.redirect().back()
  }

  async destroy({ params, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    await this.entryService.delete(boat, Number(params.entryId))

    session.flash('success', i18n.t('flash.budgetEntry.deleted'))
    return response.redirect().back()
  }
}
