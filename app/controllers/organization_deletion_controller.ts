import OrganizationDeletionService from '#services/organization_deletion_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  DemoAccountProtectedError,
  OrganizationDeletionNotScheduledError,
} from '#exceptions/account_errors'
import { formatDateLong } from '#shared/helpers/date_format'
import { deleteOrganizationValidator } from '#validators/account'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

/**
 * Suppression de l'organisation courante (#886) — zone dangereuse de
 * `/settings/org`, réservée à `organization.manage`.
 */
@inject()
export default class OrganizationDeletionController {
  constructor(private deletionService: OrganizationDeletionService) {}

  async destroy({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageOrganization')
    await user.load('organization')
    const { password, organizationName } = await request.validateUsing(deleteOrganizationValidator)

    const errors: Record<string, string[]> = {}
    if (!(await hash.verify(user.password, password))) {
      errors.password = [i18n.t('validator.settings.wrongCurrentPassword')]
    }
    if (organizationName !== user.organization.name.trim()) {
      errors.organizationName = [i18n.t('validator.settings.organizationNameMismatch')]
    }
    if (Object.keys(errors).length > 0) {
      session.flashAll()
      session.flash('inputErrorsBag', errors)
      return response.redirect().back()
    }

    try {
      const purgeAt = await this.deletionService.request(user, user.organization)
      session.flash(
        'success',
        i18n.t('flash.organizationDeletion.scheduled', {
          date: formatDateLong(purgeAt.toISO()!, i18n.locale),
        })
      )
    } catch (error) {
      if (!(error instanceof DemoAccountProtectedError)) throw error
      session.flash('error', i18n.t('flash.account.demoProtected'))
    }
    return response.redirect().back()
  }

  async cancel({ auth, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageOrganization')
    await user.load('organization')
    try {
      await this.deletionService.cancel(user, user.organization)
    } catch (error) {
      if (!(error instanceof OrganizationDeletionNotScheduledError)) throw error
    }
    session.flash('success', i18n.t('flash.organizationDeletion.cancelled'))
    return response.redirect().back()
  }
}
