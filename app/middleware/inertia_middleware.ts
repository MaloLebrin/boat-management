import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import { inject } from '@adonisjs/core'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'
import type { BrandingSharedProps } from '#shared/types/branding'
import type { NotificationsSharedProps } from '#shared/types/notification'
import type { PermissionsSharedProps } from '#shared/types/permissions'
import { BrandingService } from '#services/branding_service'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import { DEMO_SESSION_DURATION_MS } from '#shared/constants/demo'
import type User from '#models/user'

export async function resolveSharedCurrentPlan(
  user: User | undefined
): Promise<PlanTier | undefined> {
  if (!user?.organizationId) return undefined
  await user.load('organization')
  return user.organization.plan
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
    private permissionService: PermissionService
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
    const success = session?.flashMessages.get('success') as string
    const info = session?.flashMessages.get('info') as string

    const demoSessionStartedAt = session?.get('demoSessionStartedAt') as number | undefined

    const BACKEND_NAMESPACES = new Set(['flash', 'marketing', 'validator'])

    if (auth?.user?.organizationId) {
      await auth.user.load('organization')
    }
    const currentPlan = await resolveSharedCurrentPlan(auth?.user)
    const branding = await resolveSharedBranding(auth?.user, this.brandingService)
    const notifications: NotificationsSharedProps = auth?.user
      ? await this.notificationService.sharedProps(auth.user.id)
      : { unreadCount: 0, recent: [] }
    const permissions: PermissionsSharedProps = await this.permissionService.sharedProps(auth?.user)

    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      locale: ctx.inertia.always(i18n?.locale ?? 'en'),
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
        success,
        info,
      }),
      demoSessionStartedAt: ctx.inertia.always(demoSessionStartedAt),
      demoSessionDurationMs: ctx.inertia.always(
        demoSessionStartedAt !== undefined ? DEMO_SESSION_DURATION_MS : undefined
      ),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      currentPlan: ctx.inertia.always(currentPlan),
      branding: ctx.inertia.always(branding),
      notifications: ctx.inertia.always(notifications as unknown as JSONDataTypes),
      permissions: ctx.inertia.always(permissions as unknown as JSONDataTypes),
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
