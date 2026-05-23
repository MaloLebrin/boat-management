import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import type { PlanTier } from '#shared/types/plan'
import type User from '#models/user'

export async function resolveSharedCurrentPlan(user: User | undefined): Promise<PlanTier | undefined> {
  if (!user?.organizationId) return undefined
  await user.load('organization')
  return user.organization.plan
}

export default class InertiaMiddleware extends BaseInertiaMiddleware {
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

    const BACKEND_NAMESPACES = new Set(['flash', 'marketing', 'validator'])

    const currentPlan = await resolveSharedCurrentPlan(auth?.user)

    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      locale: ctx.inertia.always(i18n?.locale ?? 'en'),
      appT: ctx.inertia.always(
        Object.fromEntries(
          Object.entries(i18n?.localeTranslations ?? {})
            .filter(([k]) => !BACKEND_NAMESPACES.has(k.split('.')[0]))
        )
      ),
      path: ctx.inertia.always(ctx.request.url().split('?')[0]),
      flash: ctx.inertia.always({
        error,
        success,
      }),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      currentPlan: ctx.inertia.always(currentPlan),
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
