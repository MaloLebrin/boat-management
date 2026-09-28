import type MaintenanceTaskAssigned from '#events/maintenance_task_assigned'
import NotificationService from '#services/notification_service'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnMaintenanceTaskAssigned {
  constructor(private notificationService: NotificationService) {}

  async handle(event: MaintenanceTaskAssigned) {
    // Se confier une tâche à soi-même n'appelle pas de notification.
    if (event.assigneeId === event.assignedBy.id) return

    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const params = {
      taskTitle: event.task.title,
      boatName: event.boatName,
      assignedBy: event.assignedBy.name,
    }

    await this.notificationService.create({
      userId: event.assigneeId,
      organizationId: event.organizationId,
      type: 'maintenance.assigned',
      severity: 'info',
      title: locale.formatMessage('notifications.messages.maintenance.assigned.title', params),
      body: locale.formatMessage('notifications.messages.maintenance.assigned.body', params),
      // Le planning est ouvert à tous les rôles de maintenance, mécanicien
      // compris — la fiche bateau exige `boats.view`, qu'il n'a pas.
      actionUrl: `/planning?task=${event.task.id}`,
      metadata: { boatId: event.task.boatId, taskId: event.task.id },
    })
  }
}
