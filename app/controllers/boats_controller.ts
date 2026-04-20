import BoatService, { BoatNotFoundError } from '#services/boat_service'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatsController {
  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    const boats = await boatService.listForUser(user)

    return inertia.render('boats/index', {
      boats,
    })
  }

  async create({ inertia, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    await bouncer.authorize('boatCreate')

    return inertia.render('boats/new', {})
  }

  async store({ request, response, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.authorize('boatCreate')

    const payload = await request.validateUsing(createBoatValidator)

    const boatService = new BoatService()
    const boat = await boatService.createForUser(user, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async show({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.authorize('boatView', boat)
      return inertia.render('boats/show', { boat })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async edit({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.authorize('boatUpdate', boat)
      return inertia.render('boats/edit', { boat })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async update({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    const boat = await boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(updateBoatValidator)
    await boatService.updateForUser(user, boat, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async destroy({ params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    const boat = await boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatDelete', boat)

    await boatService.deleteForUser(user, boat)
    response.redirect('/boats')
  }
}
