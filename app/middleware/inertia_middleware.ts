import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import { inject } from '@adonisjs/core'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import {
  PLAN_LIMITS,
  type ActiveAddonInfo,
  type PlanModule,
  type PlanTier,
} from '#shared/types/plan'
import type { BrandingSharedProps } from '#shared/types/branding'
import type { NotificationsSharedProps } from '#shared/types/notification'
import type { PermissionsSharedProps } from '#shared/types/permissions'
import { DEFAULT_THEME_PREFERENCE, isThemePreference } from '#shared/types/theme'
import type { ThemePreference } from '#shared/types/theme'
import { BrandingService } from '#services/branding_service'
import NotificationService from '#services/notification_service'
import pushConfig from '#config/push'
import OrganizationModuleService from '#services/organization_module_service'
import PermissionService from '#services/permission_service'
import { DEMO_SESSION_DURATION_MS } from '#shared/constants/demo'
import DemoService from '#services/demo_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import AssistantChatService from '#services/assistant_chat_service'
import AssistantStarterService from '#services/assistant_starter_service'
import { toAssistantConversationProps } from '#transformers/assistant_transformer'
import type {
  AssistantAiUsageProps,
  AssistantConversationProps,
  AssistantStarterProps,
} from '#shared/types/assistant'
import type User from '#models/user'
import type { OrganizationType } from '#shared/types/organization'

export async function resolveSharedCurrentPlan(
  user: User | undefined
): Promise<PlanTier | undefined> {
  if (!user?.organizationId) return undefined
  await user.load('organization')
  // A loaded belongsTo can still be null (e.g. the organization row no longer
  // exists) — mirror the same guard resolveSharedBranding already has below,
  // instead of assuming the relation always resolved.
  return user.organization?.plan
}

/**
 * Profil déclaré à l'inscription (`organizations.type`), partagé avec le front
 * parce qu'il restreint des capacités : un compte particulier n'a pas de
 * marina à cartographier.
 *
 * Profil non renseigné → `undefined`, comme `resolveSharedCurrentPlan` : le
 * sérialiseur Inertia refuse un `null` dans `always()`, et une prop absente dit
 * exactement la même chose côté front — aucune restriction.
 */
export async function resolveSharedOrganizationType(
  user: User | undefined
): Promise<OrganizationType | undefined> {
  if (!user?.organizationId) return undefined
  await user.load('organization')
  return user.organization?.type ?? undefined
}

/**
 * Cascade de résolution du thème (#416), calquée sur celle de la locale dans
 * `detect_user_locale_middleware` : profil > cookie > défaut `system`.
 *
 * `system` est renvoyé tel quel — la résolution vers `light`/`dark` a lieu côté
 * client (`prefers-color-scheme`), le serveur ne peut pas la connaître.
 */
export function resolveSharedTheme(ctx: Partial<HttpContext>): ThemePreference {
  const userTheme = ctx.auth?.user?.theme
  if (isThemePreference(userTheme)) return userTheme

  const cookieTheme = ctx.request?.cookie('theme')
  if (isThemePreference(cookieTheme)) return cookieTheme

  return DEFAULT_THEME_PREFERENCE
}

export async function resolveSharedBranding(
  user: User | undefined,
  brandingService: Pick<BrandingService, 'toSharedProps'>
): Promise<BrandingSharedProps | undefined> {
  if (!user?.organization) return undefined
  const org = user.organization
  if (!PLAN_LIMITS[org.plan].canWhiteLabel) return undefined
  return brandingService.toSharedProps(org)
}

@inject()
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  constructor(
    private brandingService: BrandingService,
    private notificationService: NotificationService,
    private organizationModuleService: OrganizationModuleService,
    private permissionService: PermissionService,
    private demoService: DemoService,
    private assistantChatService: AssistantChatService,
    private assistantStarterService: AssistantStarterService,
    private aiTokenQuotaService: AiTokenQuotaService
  ) {
    super()
  }

  async share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered. In
     * certain cases, a page may get rendered before the session middleware
     * or the auth middleware are executed. For example: During a 404 request.
     *
     * In that case, we must always assume that HttpContext is not fully hydrated
     * with all the properties
     */
    const { session, auth, i18n } = ctx as Partial<HttpContext>

    const error = session?.flashMessages.get('error') as string
    // Cible facultative d'un CTA sur le toast d'erreur (upsell quota, issue #418).
    const errorAction = session?.flashMessages.get('errorAction') as string | undefined
    const success = session?.flashMessages.get('success') as string
    const info = session?.flashMessages.get('info') as string

    // Protocole de la file hors-ligne (#490, #622) : `drainQueue` lit ces
    // marqueurs dans `page.props.flash` pour distinguer un rejeu accepté d'un
    // refus métier rendu en redirection, et pour récupérer l'ID réel d'une
    // ressource créée sous ID temporaire. Sans partage ici, la modale de
    // conflit et la résolution de dépendances ne se déclenchent jamais.
    const conflictData = session?.flashMessages.get('conflictData') as string | undefined
    const conflictType = session?.flashMessages.get('conflictType') as string | undefined
    const rejectedType = session?.flashMessages.get('rejectedType') as string | undefined
    const createdResourceType = session?.flashMessages.get('createdResourceType') as
      | string
      | undefined
    const createdResourceId = session?.flashMessages.get('createdResourceId') as string | undefined

    // #451 — la clé de session posée par `/demo` survivait au logout et suivait le
    // navigateur d'un compte à l'autre : la bannière « Session démo » s'affichait
    // sur des comptes réels. La clé n'est donc partagée que si l'utilisateur
    // authentifié est bien le compte démo — la purge côté session reste faite au
    // logout (`SessionController.destroy`), ceci en est le garde-fou.
    const storedDemoSessionStartedAt = session?.get('demoSessionStartedAt') as number | undefined
    const demoSessionStartedAt =
      auth?.user && this.demoService.isDemoUser(auth.user.email)
        ? storedDemoSessionStartedAt
        : undefined

    const BACKEND_NAMESPACES = new Set(['flash', 'marketing', 'validator'])

    if (auth?.user?.organizationId) {
      await auth.user.load('organization')
    }
    const currentPlan = await resolveSharedCurrentPlan(auth?.user)
    const organizationType = await resolveSharedOrganizationType(auth?.user)
    // Modules add-ons actifs (épic #327) : partagés avec `currentPlan` pour que
    // le front résolve les quotas effectifs via le même helper que le backend.
    const activeModules: PlanModule[] = auth?.user?.organizationId
      ? await this.organizationModuleService.getActiveModules(auth.user.organizationId)
      : []
    // Add-ons quantitatifs actifs (épic #333) : partagés pour que le front
    // résolve `maxBoats` effectif via le même helper que le backend.
    const activeAddons: ActiveAddonInfo[] = auth?.user?.organizationId
      ? await this.organizationModuleService.getActiveAddons(auth.user.organizationId)
      : []
    const branding = await resolveSharedBranding(auth?.user, this.brandingService)
    const notifications: NotificationsSharedProps = auth?.user
      ? await this.notificationService.sharedProps(auth.user.id)
      : { unreadCount: 0, recent: [] }
    const permissions: PermissionsSharedProps = await this.permissionService.sharedProps(auth?.user)

    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      locale: ctx.inertia.always(i18n?.locale ?? 'en'),
      theme: ctx.inertia.always(resolveSharedTheme(ctx)),
      appT: ctx.inertia.always(
        Object.fromEntries(
          Object.entries(i18n?.localeTranslations ?? {}).filter(
            ([k]) => !BACKEND_NAMESPACES.has(k.split('.')[0])
          )
        )
      ),
      path: ctx.inertia.always(ctx.request.url().split('?')[0]),
      flash: ctx.inertia.always({
        error,
        errorAction,
        success,
        info,
        conflictData,
        conflictType,
        rejectedType,
        createdResourceType,
        createdResourceId,
      }),
      demoSessionStartedAt: ctx.inertia.always(demoSessionStartedAt),
      demoSessionDurationMs: ctx.inertia.always(
        demoSessionStartedAt !== undefined ? DEMO_SESSION_DURATION_MS : undefined
      ),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      currentPlan: ctx.inertia.always(currentPlan),
      organizationType: ctx.inertia.always(organizationType),
      activeModules: ctx.inertia.always(activeModules),
      activeAddons: ctx.inertia.always(activeAddons as unknown as JSONDataTypes),
      branding: ctx.inertia.always(branding),
      notifications: ctx.inertia.always(notifications as unknown as JSONDataTypes),
      // Clé publique VAPID (#497) — en shared prop plutôt qu'en VITE_* : une
      // rotation de clés ne demande pas de rebuild du front. Absente si le
      // push n'est pas configuré.
      vapidPublicKey: ctx.inertia.always(
        pushConfig.enabled ? pushConfig.vapidPublicKey : undefined
      ),
      permissions: ctx.inertia.always(permissions as unknown as JSONDataTypes),
      // Conversation du copilote FleetAi : prop « optional » — évaluée
      // uniquement quand le panneau la demande via un partial reload
      // (`only: ['assistantConversation']`), zéro coût sur les pages normales.
      // Enveloppée dans un objet : le serializer Inertia jette sur une prop
      // résolue à `null` (même contrainte que `aiFleetAnalysis`, cf. #478).
      assistantConversation: ctx.inertia.optional(async () => {
        const conversation = auth?.user
          ? await this.assistantChatService.getActiveConversation(auth.user)
          : null
        // Consommation IA du mois (#642) : même paire que la page de
        // facturation (`AiTokenQuotaService.getUsage` + `PLAN_LIMITS`),
        // rendue en pied de panneau.
        const organization = auth?.user?.organization
        const aiUsage: AssistantAiUsageProps | null = organization
          ? {
              used: await this.aiTokenQuotaService.getUsage(organization.id),
              limit: PLAN_LIMITS[organization.plan].aiTokensPerMonth,
            }
          : null
        // Suggestions de démarrage : uniquement sur fil vide — les partial
        // reloads qui suivent chaque message ne paient rien.
        const starters: AssistantStarterProps[] =
          auth?.user && conversation === null
            ? await this.assistantStarterService.buildStarters(
                auth.user,
                ctx.request.url().split('?')[0]
              )
            : []
        const props: {
          conversation: AssistantConversationProps | null
          aiUsage: AssistantAiUsageProps | null
          starters: AssistantStarterProps[]
        } = {
          conversation: conversation ? toAssistantConversationProps(conversation) : null,
          aiUsage,
          starters,
        }
        return props as unknown as JSONDataTypes
      }),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
