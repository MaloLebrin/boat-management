import CrewService, {
  CrewMemberNotFoundError,
  CrewCertificationNotFoundError,
} from '#services/crew_service'
import CrewMemberPolicy from '#policies/crew_member_policy'
import { createCrewCertificationValidator } from '#validators/crew'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CrewCertificationsController {
  constructor(private crewService: CrewService) {}

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('update')
    await user.load('organization')

    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.memberId)
      )
      const payload = await request.validateUsing(createCrewCertificationValidator)
      await this.crewService.addCertification(member, {
        type: payload.type,
        referenceNumber: payload.referenceNumber ?? null,
        expiresAt: payload.expiresAt ?? null,
      })
    } catch (error) {
      if (error instanceof CrewMemberNotFoundError) {
        session.flash('error', i18n.t('flash.crew.notFound'))
        response.redirect('/crew')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.crew.certificationAdded'))
    response.redirect('/crew')
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('update')
    await user.load('organization')

    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.memberId)
      )
      await this.crewService.deleteCertification(member, Number(params.certId))
    } catch (error) {
      if (
        error instanceof CrewMemberNotFoundError ||
        error instanceof CrewCertificationNotFoundError
      ) {
        session.flash('error', i18n.t('flash.crew.notFound'))
        response.redirect('/crew')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.crew.certificationDeleted'))
    response.redirect('/crew')
  }
}
