import OrganizationMemberService from '#services/organization_member_service'
import OrganizationInvitationService from '#services/organization_invitation_service'
import SubscriptionService from '#services/subscription_service'
import QuotaService from '#services/quota_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import OrganizationModuleService from '#services/organization_module_service'
import { BrandingService } from '#services/branding_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  updateAiSettingsValidator,
  updateOrganizationValidator,
  updateProfileValidator,
} from '#validators/user'
import { updateBrandingValidator, uploadLogoValidator } from '#validators/branding'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PLAN_LIMITS } from '#shared/types/plan'

@inject()
export default class SettingsController {
  constructor(
    private memberService: OrganizationMemberService,
    private invitationService: OrganizationInvitationService,
    private subscriptionService: SubscriptionService,
    private quotaService: QuotaService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private organizationModuleService: OrganizationModuleService,
    private brandingService: BrandingService
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

    const [boatCount, memberCount, activeSub, aiTokensUsed, orgModules, orgAddons, effective] =
      await Promise.all([
        this.quotaService.countBoats(org),
        this.quotaService.countMembers(org),
        this.subscriptionService.getActive(org.id),
        this.aiTokenQuotaService.getUsage(org.id),
        this.organizationModuleService.listWithSource(org.id),
        this.organizationModuleService.getActiveAddons(org.id),
        this.organizationModuleService.getEffectiveQuotas(org),
      ])

    return inertia.render('settings/billing', {
      plan: org.plan,
      quotaUsage: {
        // Limite bateaux = quota effectif (inclut l'add-on `extra_boats`, #333).
        boats: { used: boatCount, limit: effective.maxBoats },
        members: { used: memberCount, limit: limits.maxMembers },
        storage: { usedBytes: org.storageUsedBytes, limitBytes: storageLimit },
        aiTokens: { used: aiTokensUsed, limit: limits.aiTokensPerMonth },
        canUseAI: limits.canUseAI,
        canExport: limits.canExport,
      },
      subscription: activeSub ? this.subscriptionService.toInfo(activeSub) : null,
      // Nommé `orgModules` (et non `activeModules`) pour NE PAS écraser la prop
      // Inertia partagée `activeModules: PlanModule[]` (chaînes) posée par le
      // middleware et consommée par `usePlan()`/la nav — la fusion Inertia
      // {...shared, ...pageProps} ferait sinon tomber les quotas à tier-only ici.
      orgModules,
      // Add-ons quantitatifs actifs (ex. `extra_boats`) avec quantité + origine.
      orgAddons,
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

  async branding({ inertia, auth, bouncer, response }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!this.guardWhiteLabel(org, response)) return
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    return inertia.render('settings/branding', {
      branding: this.brandingService.toBrandingConfig(org),
    })
  }

  async updateBranding({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!this.guardWhiteLabel(org, response)) return
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    const data = await request.validateUsing(updateBrandingValidator)
    await this.brandingService.updateBranding(org, data)

    session.flash('success', i18n.t('flash.settings.brandingUpdated'))
    return response.redirect().back()
  }

  async uploadLogo({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!this.guardWhiteLabel(org, response)) return
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    const { logo } = await request.validateUsing(uploadLogoValidator)
    await this.brandingService.uploadLogo(org, logo)

    session.flash('success', i18n.t('flash.settings.logoUpdated'))
    return response.redirect().back()
  }

  async deleteLogo({ response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (!this.guardWhiteLabel(org, response)) return
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    await this.brandingService.deleteLogo(org)

    session.flash('success', i18n.t('flash.settings.logoDeleted'))
    return response.redirect().back()
  }

  private guardWhiteLabel(
    org: { plan: keyof typeof PLAN_LIMITS },
    response: HttpContext['response']
  ): boolean {
    if (!PLAN_LIMITS[org.plan].canWhiteLabel) {
      response.redirect('/settings/billing')
      return false
    }
    return true
  }
}
