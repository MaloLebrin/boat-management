import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import NotificationService from '#services/notification_service'
import * as NotificationTransformer from '#transformers/notification_transformer'

@inject()
export default class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Number(request.qs().page ?? 1)
    const paginator = await this.notificationService.listForUser(user.id, page)
    const { meta } = paginator.toJSON()
    return inertia.render('notifications/index', {
      notifications: {
        data: [...paginator].map(NotificationTransformer.toRow),
        meta,
      },
    })
  }

  async markAsRead({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.notificationService.markRead(user.id, Number(params.id))
    return response.redirect().back()
  }

  async markAllAsRead({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.notificationService.markAllRead(user.id)
    return response.redirect().back()
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.notificationService.destroy(user.id, Number(params.id))
    return response.redirect().back()
  }
}
