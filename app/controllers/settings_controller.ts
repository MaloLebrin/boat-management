import OrganizationMemberService from '#services/organization_member_service'
import PushSubscriptionService from '#services/push_subscription_service'
import * as PushSubscriptionTransformer from '#transformers/push_subscription_transformer'
import OrganizationInvitationService from '#services/organization_invitation_service'
import SubscriptionService from '#services/subscription_service'
import QuotaService from '#services/quota_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import OrganizationModuleService from '#services/organization_module_service'
import BoatListService from '#services/boat_list_service'
import { BrandingService } from '#services/branding_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  changePasswordValidator,
  updateAiApiKeyValidator,
  updateAiSettingsValidator,
  updateLocaleValidator,
  updateOrganizationValidator,
  updateProfileValidator,
  updateThemeValidator,
} from '#validators/user'
import { updateBrandingValidator, uploadLogoValidator } from '#validators/branding'
import { inject } from '@adonisjs/core'
import encryption from '@adonisjs/core/services/encryption'
import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { BooleanQuotaKey } from '#shared/types/plan'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'

@inject()
export default class SettingsController {
  constructor(
    private memberService: OrganizationMemberService,
    private invitationService: OrganizationInvitationService,
    private subscriptionService: SubscriptionService,
    private quotaService: QuotaService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private organizationModuleService: OrganizationModuleService,
    private brandingService: BrandingService,
    private boatListService: BoatListService,
    private pushSubscriptionService: PushSubscriptionService
  ) {}
  async me({ inertia }: HttpContext) {
    return inertia.render('settings/me', {})
  }

  /** Gestion des notifications push et des appareils abonnés (#498). */
  async notifications({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    const subscriptions = await this.pushSubscriptionService.listForUser(user.id)
    return inertia.render('settings/notifications', {
      pushSubscriptions: subscriptions.map(PushSubscriptionTransformer.toRow),
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

    const [members, pendingInvitations, canManageMembers, canAddMember, boatOptions] =
      await Promise.all([
        this.memberService.listMembers(user.organizationId!),
        this.invitationService.listPending(user.organizationId!),
        bouncer.with(OrganizationPolicy).allows('manageMembers'),
        this.quotaService.canAddMember(user.organization),
        this.boatListService.listNamesForOrg(user),
      ])

    return inertia.render('settings/members', {
      currentUserId: user.id,
      members,
      pendingInvitations,
      canManageMembers,
      canAddMember,
      boatOptions,
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

  async changePassword({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    const isValid = await hash.verify(user.password, currentPassword)
    if (!isValid) {
      session.flashAll()
      session.flash('inputErrorsBag', {
        currentPassword: [i18n.t('validator.settings.wrongCurrentPassword')],
      })
      return response.redirect().back()
    }

    user.password = password
    await user.save()

    session.flash('success', i18n.t('flash.settings.passwordUpdated'))
    return response.redirect().back()
  }

  async updateLocale({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const { locale } = await request.validateUsing(updateLocaleValidator)

    user.locale = locale
    await user.save()

    // Keep the cookie in sync so pre-auth pages (login, marketing) match the
    // persisted preference right away — cf. #403.
    response.cookie('locale', locale, { maxAge: '365d', path: '/', httpOnly: false })

    session.flash('success', i18n.t('flash.settings.localeUpdated'))
    return response.redirect().back()
  }

  async updateTheme({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const { theme } = await request.validateUsing(updateThemeValidator)

    user.theme = theme
    await user.save()

    // Le cookie double la colonne pour que les pages pré-auth (login,
    // marketing) rendent le bon thème dès le serveur, sans flash de couleur —
    // même schéma que la locale (#403). Il est signé et lu côté serveur
    // uniquement : le front applique le thème via la prop partagée.
    response.cookie('theme', theme, { maxAge: '365d', path: '/' })

    session.flash('success', i18n.t('flash.settings.themeUpdated'))
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

  async ai({ inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    // La page est ouverte dès qu'un plan a l'IA (`canUseAI`) : la clé API BYOK
    // est un outil de maîtrise des coûts, pas une personnalisation enterprise.
    // Les sections prompt/modèle restent gardées par `canCustomizeAI`
    // (`updateAiSettings`) et masquées côté front.
    if (
      !this.guardPlanFeature(org, 'canUseAI', 'aiSettingsRequirePlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
    }

    await bouncer.with(OrganizationPolicy).authorize('configureAI')

    return inertia.render('settings/ai', {
      aiSystemPrompt: org.aiSystemPrompt,
      aiModelOverride: org.aiModelOverride,
      // Jamais la clé elle-même — seul ce booléen sort du backend.
      hasCustomApiKey: org.aiApiKeyEncrypted !== null,
    })
  }

  async updateAiSettings({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (
      !this.guardPlanFeature(org, 'canCustomizeAI', 'aiCustomizationRequiresPlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
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

  /** Enregistre la clé API Mistral de l'org (BYOK) — chiffrée au repos. */
  async updateAiApiKey({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (
      !this.guardPlanFeature(org, 'canUseAI', 'aiSettingsRequirePlan', { response, session, i18n })
    ) {
      return
    }

    await bouncer.with(OrganizationPolicy).authorize('configureAI')

    const { aiApiKey } = await request.validateUsing(updateAiApiKeyValidator)

    org.aiApiKeyEncrypted = encryption.encrypt(aiApiKey)
    await org.save()

    session.flash('success', i18n.t('flash.settings.aiApiKeyUpdated'))
    return response.redirect().back()
  }

  /** Retire la clé API de l'org — retour à la clé de l'app et à son quota. */
  async removeAiApiKey({ response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (
      !this.guardPlanFeature(org, 'canUseAI', 'aiSettingsRequirePlan', { response, session, i18n })
    ) {
      return
    }

    await bouncer.with(OrganizationPolicy).authorize('configureAI')

    org.aiApiKeyEncrypted = null
    await org.save()

    session.flash('success', i18n.t('flash.settings.aiApiKeyRemoved'))
    return response.redirect().back()
  }

  async branding({ inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (
      !this.guardPlanFeature(org, 'canWhiteLabel', 'brandingRequiresPlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
    }
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    return inertia.render('settings/branding', {
      branding: this.brandingService.toBrandingConfig(org),
    })
  }

  async updateBranding({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    const org = user.organization

    if (
      !this.guardPlanFeature(org, 'canWhiteLabel', 'brandingRequiresPlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
    }
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

    if (
      !this.guardPlanFeature(org, 'canWhiteLabel', 'brandingRequiresPlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
    }
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

    if (
      !this.guardPlanFeature(org, 'canWhiteLabel', 'brandingRequiresPlan', {
        response,
        session,
        i18n,
      })
    ) {
      return
    }
    await bouncer.with(OrganizationPolicy).authorize('configureBranding')

    await this.brandingService.deleteLogo(org)

    session.flash('success', i18n.t('flash.settings.logoDeleted'))
    return response.redirect().back()
  }

  /**
   * Garde une section de réglages derrière un flag de plan. Une section fermée
   * renvoie sur la facturation **avec un flash explicite** (#456) : sans lui, la
   * redirection est muette et l'utilisateur croit à un bug — d'autant que la
   * carte plan coche « IA / Copilote » sur Pro, alors que seule la
   * *personnalisation* du prompt est réservée à Entreprise.
   */
  private guardPlanFeature(
    org: { plan: keyof typeof PLAN_LIMITS },
    flag: BooleanQuotaKey,
    flashKey: string,
    { response, session, i18n }: Pick<HttpContext, 'response' | 'session' | 'i18n'>
  ): boolean {
    if (!PLAN_LIMITS[org.plan][flag]) {
      session.flash('error', i18n.t(`flash.settings.${flashKey}`))
      response.redirect(BILLING_SETTINGS_PATH)
      return false
    }
    return true
  }
}
