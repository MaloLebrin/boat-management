import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'

transmit.registerRoutes()

transmit.authorize<{ userId: string }>(
  'notifications/:userId',
  (ctx: HttpContext, { userId }: { userId: string }) => {
    return ctx.auth.user?.id === Number(userId)
  }
)
