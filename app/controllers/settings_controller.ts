import OrganizationMemberService from '#services/organization_member_service'
import OrganizationInvitationService from '#services/organization_invitation_service'
import SubscriptionService from '#services/subscription_service'
import QuotaService from '#services/quota_service'
import OrganizationPolicy from '#policies/organization_policy'
import { updateOrganizationValidator, updateProfileValidator } from '#validators/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Boat from '#models/boat'
import OrganizationMembership from '#models/organization_membership'
import { PLAN_LIMITS } from '#shared/types/plan'

@inject()
export default class SettingsController {
  constructor(
    private memberService: OrganizationMemberService,
    private invitationService: OrganizationInvitationService,
    private subscriptionService: SubscriptionService,
    private quotaService: QuotaService
  ) {}
  async me({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()

    return inertia.render('settings/me', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    })
  }

  async org({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    return inertia.render('settings/org', {
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    })
  }

  async members({ inertia, auth, bouncer }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    const [members, pendingInvitations, canManageMembers, canAddMember] = await Promise.all([
      this.memberService.listMembers(user.organizationId!),
      this.invitationService.listPending(user.organizationId!),
      bouncer.with(OrganizationPolicy).allows('manageMembers'),
      this.quotaService.canAddMember(user.organization),
    ])

    return inertia.render('settings/members', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      members,
      pendingInvitations,
      canManageMembers,
      canAddMember,
    })
  }

  async billing({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization
    const limits = PLAN_LIMITS[org.plan]

    const [boatRows, memberRows, activeSub] = await Promise.all([
      Boat.query().where('organizationId', org.id).count('* as total'),
      OrganizationMembership.query().where('organizationId', org.id).count('* as total'),
      this.subscriptionService.getActive(org.id),
    ])

    return inertia.render('settings/billing', {
      plan: org.plan,
      quotaUsage: {
        boats: { used: Number(boatRows[0].$extras.total), limit: limits.maxBoats },
        members: { used: Number(memberRows[0].$extras.total), limit: limits.maxMembers },
        canUseAI: limits.canUseAI,
        canExport: limits.canExport,
      },
      subscription: activeSub ? this.subscriptionService.toInfo(activeSub) : null,
    })
  }

  async updateProfile({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const { fullName } = await request.validateUsing(updateProfileValidator)

    user.fullName = fullName
    await user.save()

    session.flash('success', i18n.t('flash.settings.profileUpdated'))
    return response.redirect().back()
  }

  async updateOrganization({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    const { name } = await request.validateUsing(updateOrganizationValidator)

    user.organization.name = name
    await user.organization.save()

    session.flash('success', i18n.t('flash.settings.orgUpdated'))
    return response.redirect().back()
  }
}
