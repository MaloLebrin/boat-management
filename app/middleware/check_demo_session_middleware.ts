import DemoService from '#services/demo_service'
import { DEMO_SESSION_DURATION_MS } from '#shared/constants/demo'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

@inject()
export default class CheckDemoSessionMiddleware {
  constructor(private demoService: DemoService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (user && this.demoService.isDemoUser(user.email)) {
      const startedAt = ctx.session.get('demoSessionStartedAt') as number | undefined
      if (!startedAt || Date.now() - startedAt > DEMO_SESSION_DURATION_MS) {
        await ctx.auth.use('web').logout()
        try {
          await this.demoService.scheduleReset()
        } catch (err) {
          logger.warn({ err }, 'CheckDemoSessionMiddleware: failed to schedule reset on expiry')
        }
        ctx.session.flash('info', ctx.i18n.t('flash.demo.sessionExpired'))
        return ctx.response.redirect().toRoute('session.create')
      }
    }
    return next()
  }
}
