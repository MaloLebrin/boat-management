import OrganizationMemberService from '#services/organization_member_service'
import OrganizationInvitationService from '#services/organization_invitation_service'
import SubscriptionService from '#services/subscription_service'
import QuotaService from '#services/quota_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  updateAiSettingsValidator,
  updateOrganizationValidator,
  updateProfileValidator,
} from '#validators/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PLAN_LIMITS } from '#shared/types/plan'

@inject()
export default class SettingsController {
  constructor(
    private memberService: OrganizationMemberService,
    private invitationService: OrganizationInvitationService,
    private subscriptionService: SubscriptionService,
    private quotaService: QuotaService
  ) {}
  async me({ inertia }: HttpContext) {
    return inertia.render('settings/me', {})
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
      currentUserId: user.id,
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
    const storageLimit = this.quotaService.storageLimitBytes(org)

    const [boatCount, memberCount, activeSub] = await Promise.all([
      this.quotaService.countBoats(org),
      this.quotaService.countMembers(org),
      this.subscriptionService.getActive(org.id),
    ])

    return inertia.render('settings/billing', {
      plan: org.plan,
      quotaUsage: {
        boats: { used: boatCount, limit: limits.maxBoats },
        members: { used: memberCount, limit: limits.maxMembers },
        storage: { usedBytes: org.storageUsedBytes, limitBytes: storageLimit },
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

  async ai({ inertia, auth, bouncer, response }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!PLAN_LIMITS[org.plan].canCustomizeAI) {
      return response.redirect('/settings/billing')
    }

    await bouncer.with(OrganizationPolicy).authorize('configureAI')

    return inertia.render('settings/ai', {
      aiSystemPrompt: org.aiSystemPrompt,
      aiModelOverride: org.aiModelOverride,
    })
  }

  async updateAiSettings({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!PLAN_LIMITS[org.plan].canCustomizeAI) {
      return response.redirect('/settings/billing')
    }

    await bouncer.with(OrganizationPolicy).authorize('configureAI')

    const { aiSystemPrompt, aiModelOverride } =
      await request.validateUsing(updateAiSettingsValidator)

    org.aiSystemPrompt = aiSystemPrompt ?? null
    org.aiModelOverride = aiModelOverride ?? null
    await org.save()

    session.flash('success', i18n.t('flash.settings.aiSettingsUpdated'))
    return response.redirect().back()
  }
}
