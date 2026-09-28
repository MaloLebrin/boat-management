import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis quand une tâche de maintenance est confiée à un membre (#868), à la
 * création comme à la modification. Le listener notifie l'assigné — sauf s'il
 * se l'est confiée lui-même.
 */
export default class MaintenanceTaskAssigned extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly task: { id: number; title: string; boatId: number },
    public readonly boatName: string,
    public readonly assigneeId: number,
    public readonly assignedBy: { id: number; name: string }
  ) {
    super()
  }
}
