import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import NotificationService from '#services/notification_service'
import * as NotificationTransformer from '#transformers/notification_transformer'
import { notificationIdValidator, notificationPageValidator } from '#validators/notification'

@inject()
export default class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page } = await request.validateUsing(notificationPageValidator)
    const paginator = await this.notificationService.listForUser(user.id, page ?? 1)
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
    const { id } = await notificationIdValidator.validate(params)
    await this.notificationService.markRead(user.id, id)
    return response.redirect().back()
  }

  async markAllAsRead({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.notificationService.markAllRead(user.id)
    return response.redirect().back()
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await notificationIdValidator.validate(params)
    await this.notificationService.destroy(user.id, id)
    return response.redirect().back()
  }
}
