import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BoatPortStayService from '#services/boat_port_stay_service'
import BoatPolicy from '#policies/boat_policy'
import { boatPortStayValidator } from '#validators/boat_port_stay_validator'

@inject()
export default class BoatPortStayController {
  constructor(
    private boatService: BoatService,
    private portStayService: BoatPortStayService
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

    const data = await request.validateUsing(boatPortStayValidator)

    await this.portStayService.create(boat, {
      portName: data.portName,
      startedAt: data.startedAt,
      endedAt: data.endedAt ?? null,
      cost: data.cost ?? null,
      notes: data.notes ?? null,
    })

    session.flash('success', i18n.t('flash.portStay.created'))
    return response.redirect().back()
  }

  async update({ params, request, response, auth, bouncer, session, i18n }: HttpContext) {
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

    const data = await request.validateUsing(boatPortStayValidator)
    await this.portStayService.update(boat, Number(params.stayId), {
      portName: data.portName,
      startedAt: data.startedAt,
      endedAt: data.endedAt ?? null,
      cost: data.cost ?? null,
      notes: data.notes ?? null,
    })

    session.flash('success', i18n.t('flash.portStay.updated'))
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

    await this.portStayService.delete(boat, Number(params.stayId))

    session.flash('success', i18n.t('flash.portStay.deleted'))
    return response.redirect().back()
  }
}
