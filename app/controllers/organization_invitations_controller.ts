import OrganizationInvitationService from '#services/organization_invitation_service'
import EmailQueueService from '#services/email_queue_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  AlreadyMemberError,
  InvitationAlreadyAcceptedError,
  InvitationAlreadyExistsError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '#exceptions/organization_errors'
import { acceptInvitationValidator, inviteMemberValidator } from '#validators/organization_member'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class OrganizationInvitationsController {
  constructor(
    private invitationService: OrganizationInvitationService,
    private emailQueueService: EmailQueueService
  ) {}

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageMembers')

    try {
      const payload = await request.validateUsing(inviteMemberValidator)

      await user.load('organization')
      const { invitation, plainToken } = await this.invitationService.create(
        user.organizationId!,
        user.id,
        payload.email,
        payload.role
      )

      const acceptUrl = `${env.get('APP_URL')}/invitations/accept?token=${plainToken}`
      await this.emailQueueService.sendInvitation({
        to: invitation.email,
        inviterName: user.fullName,
        orgName: user.organization.name,
        acceptUrl,
      })

      session.flash('success', i18n.t('flash.invitation.sent'))
    } catch (error) {
      if (error instanceof InvitationAlreadyExistsError) {
        session.flash('error', i18n.t('flash.invitation.alreadyPending'))
        return response.redirect().back()
      }
      if (error instanceof AlreadyMemberError) {
        session.flash('error', i18n.t('flash.invitation.alreadyMember'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async destroy({ params, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageMembers')

    try {
      await this.invitationService.cancel(Number(params.id), user.organizationId!)
      session.flash('success', i18n.t('flash.invitation.cancelled'))
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        session.flash('error', i18n.t('flash.invitation.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async show({ request, inertia, auth }: HttpContext) {
    const token = request.qs().token as string | undefined

    if (!token) {
      return inertia.render('invitations/accept', {
        error: 'not_found',
        invitation: null,
        isAuthenticated: false,
        token: null,
      })
    }

    await auth.check()
    const isAuthenticated = auth.isAuthenticated

    try {
      const invitation = await this.invitationService.verifyToken(token)

      return inertia.render('invitations/accept', {
        error: null,
        invitation: {
          email: invitation.email,
          role: invitation.role,
          orgName: invitation.organization.name,
          invitedByName: invitation.invitedBy?.fullName ?? null,
          expiresAt: invitation.expiresAt.toISO(),
        },
        isAuthenticated,
        token,
      })
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        return inertia.render('invitations/accept', {
          error: 'not_found',
          invitation: null,
          isAuthenticated,
          token: null,
        })
      }
      if (error instanceof InvitationExpiredError) {
        return inertia.render('invitations/accept', {
          error: 'expired',
          invitation: null,
          isAuthenticated,
          token: null,
        })
      }
      if (error instanceof InvitationAlreadyAcceptedError) {
        return inertia.render('invitations/accept', {
          error: 'already_used',
          invitation: null,
          isAuthenticated,
          token: null,
        })
      }
      throw error
    }
  }

  async accept({ request, response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const { token } = await request.validateUsing(acceptInvitationValidator)
      await this.invitationService.accept(token, user.id)

      session.flash('success', i18n.t('flash.invitation.accepted'))
      return response.redirect().toPath('/settings/members')
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        session.flash('error', i18n.t('flash.invitation.notFound'))
        return response.redirect().back()
      }
      if (error instanceof InvitationExpiredError) {
        session.flash('error', i18n.t('flash.invitation.expired'))
        return response.redirect().back()
      }
      if (error instanceof InvitationAlreadyAcceptedError) {
        session.flash('error', i18n.t('flash.invitation.alreadyUsed'))
        return response.redirect().back()
      }
      if (error instanceof AlreadyMemberError) {
        session.flash('error', i18n.t('flash.invitation.alreadyMember'))
        return response.redirect().back()
      }
      throw error
    }
  }
}
