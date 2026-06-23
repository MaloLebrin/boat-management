import CrewService, { CrewMemberNotFoundError } from '#services/crew_service'
import CrewMemberPolicy from '#policies/crew_member_policy'
import { createCrewMemberValidator, updateCrewMemberValidator } from '#validators/crew'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CrewMembersController {
  constructor(private crewService: CrewService) {}

  async index({ inertia, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('create')
    await user.load('organization')

    const [crewMembers, canDelete] = await Promise.all([
      this.crewService.listForOrganization(user.organization),
      bouncer.with(CrewMemberPolicy).allows('delete'),
    ])

    return inertia.render('organization/crew', { crewMembers, canDelete })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('create')
    await user.load('organization')

    const payload = await request.validateUsing(createCrewMemberValidator)
    await this.crewService.create(user.organization, payload)

    session.flash('success', i18n.t('flash.crew.created'))
    response.redirect('/crew')
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('update')
    await user.load('organization')

    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.id)
      )
      const payload = await request.validateUsing(updateCrewMemberValidator)
      await this.crewService.update(member, payload)
    } catch (error) {
      if (error instanceof CrewMemberNotFoundError) {
        session.flash('error', i18n.t('flash.crew.notFound'))
        response.redirect('/crew')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.crew.updated'))
    response.redirect('/crew')
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('delete')
    await user.load('organization')

    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.id)
      )
      await this.crewService.delete(member)
    } catch (error) {
      if (error instanceof CrewMemberNotFoundError) {
        session.flash('error', i18n.t('flash.crew.notFound'))
        response.redirect('/crew')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.crew.deleted'))
    response.redirect('/crew')
  }
}
