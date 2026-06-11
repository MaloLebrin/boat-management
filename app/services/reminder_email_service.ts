import Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import Port from '#models/port'
import User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import type { ReminderBoatItem, ReminderPortItem, ReminderTaskItem } from '#shared/types/reminder'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

@inject()
export default class ReminderEmailService {
  constructor(private emailQueueService: EmailQueueService) {}

  async sendInactiveAccountReminders(): Promise<void> {
    const sevenDaysAgo = DateTime.now().minus({ days: 7 })

    const orgs = await Organization.query()
      .where('createdAt', '<', sevenDaysAgo.toISO())
      .whereNotExists((query) => {
        query.from('boats').whereColumn('boats.organization_id', 'organizations.id')
      })

    if (orgs.length === 0) {
      logger.info('ReminderEmailService.sendInactiveAccountReminders: no targets')
      return
    }

    let sent = 0
    for (const org of orgs) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', org.id)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderInactiveAccount({
          to: membership.user.email,
          name: membership.user.fullName,
          orgName: org.name,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendInactiveAccountReminders: done')
  }

  async sendIncompleteBoatReminders(): Promise<void> {
    const boats = await Boat.query()
      .whereRaw(
        `(
          CASE WHEN type IS NULL THEN 1 ELSE 0 END
          + CASE WHEN registration_number IS NULL THEN 1 ELSE 0 END
          + CASE WHEN length_m IS NULL THEN 1 ELSE 0 END
          + CASE WHEN year_built IS NULL THEN 1 ELSE 0 END
          + CASE WHEN manufacturer IS NULL THEN 1 ELSE 0 END
          + CASE WHEN model IS NULL THEN 1 ELSE 0 END
        ) >= 3`
      )
      .select('id', 'name', 'organization_id')

    if (boats.length === 0) {
      logger.info('ReminderEmailService.sendIncompleteBoatReminders: no targets')
      return
    }

    const boatsByOrg = new Map<number, ReminderBoatItem[]>()
    for (const boat of boats) {
      const list = boatsByOrg.get(boat.organizationId) ?? []
      list.push({ id: boat.id, name: boat.name })
      boatsByOrg.set(boat.organizationId, list)
    }

    let sent = 0
    for (const [orgId, orgBoats] of boatsByOrg) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', orgId)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderIncompleteBoats({
          to: membership.user.email,
          name: membership.user.fullName,
          boats: orgBoats,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendIncompleteBoatReminders: done')
  }

  async sendIncompletePortReminders(): Promise<void> {
    const ports = await Port.query()
      .where((q) => {
        q.whereNull('city').orWhereNull('country')
      })
      .select('id', 'name', 'organization_id')

    if (ports.length === 0) {
      logger.info('ReminderEmailService.sendIncompletePortReminders: no targets')
      return
    }

    const portsByOrg = new Map<number, ReminderPortItem[]>()
    for (const port of ports) {
      const list = portsByOrg.get(port.organizationId) ?? []
      list.push({ id: port.id, name: port.name })
      portsByOrg.set(port.organizationId, list)
    }

    let sent = 0
    for (const [orgId, orgPorts] of portsByOrg) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', orgId)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderIncompletePorts({
          to: membership.user.email,
          name: membership.user.fullName,
          ports: orgPorts,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendIncompletePortReminders: done')
  }

  async sendInactiveLoginReminders(): Promise<void> {
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 })

    const users = await User.query().where((q) => {
      q.where('lastLoginAt', '<', thirtyDaysAgo.toISO()).orWhere((q2) => {
        q2.whereNull('lastLoginAt').where('createdAt', '<', thirtyDaysAgo.toISO())
      })
    })

    if (users.length === 0) {
      logger.info('ReminderEmailService.sendInactiveLoginReminders: no targets')
      return
    }

    let sent = 0
    for (const user of users) {
      await this.emailQueueService.sendReminderInactiveLogin({
        to: user.email,
        name: user.fullName,
        lastLoginAt: user.lastLoginAt?.toISO() ?? null,
      })
      sent++
    }

    logger.info({ sent }, 'ReminderEmailService.sendInactiveLoginReminders: done')
  }

  async sendOverdueTaskReminders(): Promise<void> {
    const today = DateTime.now().startOf('day')

    const tasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereNotNull('dueAt')
      .where('dueAt', '<', today.toISO())
      .select('id', 'title', 'due_at', 'boat_id')
      .preload('boat', (q) => q.select('id', 'name', 'organization_id'))

    if (tasks.length === 0) {
      logger.info('ReminderEmailService.sendOverdueTaskReminders: no targets')
      return
    }

    const tasksByOrg = new Map<number, ReminderTaskItem[]>()
    for (const task of tasks) {
      const orgId = task.boat.organizationId
      const list = tasksByOrg.get(orgId) ?? []
      list.push({
        id: task.id,
        title: task.title,
        boatName: task.boat.name,
        dueAt: task.dueAt?.toISO() ?? null,
      })
      tasksByOrg.set(orgId, list)
    }

    let sent = 0
    for (const [orgId, orgTasks] of tasksByOrg) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', orgId)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderOverdueTasks({
          to: membership.user.email,
          name: membership.user.fullName,
          tasks: orgTasks,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendOverdueTaskReminders: done')
  }

  async sendEngineTaskReminders(): Promise<void> {
    const now = DateTime.now()
    const in30Days = now.plus({ days: 30 })

    const tasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .where('subject', 'engine')
      .whereNotNull('dueAt')
      .where('dueAt', '>=', now.startOf('day').toISO())
      .where('dueAt', '<=', in30Days.endOf('day').toISO())
      .select('id', 'title', 'due_at', 'boat_id')
      .preload('boat', (q) => q.select('id', 'name', 'organization_id'))

    if (tasks.length === 0) {
      logger.info('ReminderEmailService.sendEngineTaskReminders: no targets')
      return
    }

    const tasksByOrg = new Map<number, ReminderTaskItem[]>()
    for (const task of tasks) {
      const orgId = task.boat.organizationId
      const list = tasksByOrg.get(orgId) ?? []
      list.push({
        id: task.id,
        title: task.title,
        boatName: task.boat.name,
        dueAt: task.dueAt?.toISO() ?? null,
      })
      tasksByOrg.set(orgId, list)
    }

    let sent = 0
    for (const [orgId, orgTasks] of tasksByOrg) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', orgId)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderEngineTasks({
          to: membership.user.email,
          name: membership.user.fullName,
          tasks: orgTasks,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendEngineTaskReminders: done')
  }

  async sendBoatCheckReminders(): Promise<void> {
    const now = DateTime.now()
    const in30Days = now.plus({ days: 30 })

    const tasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .where('subject', 'boat')
      .whereNotNull('dueAt')
      .where('dueAt', '>=', now.startOf('day').toISO())
      .where('dueAt', '<=', in30Days.endOf('day').toISO())
      .select('id', 'title', 'due_at', 'boat_id')
      .preload('boat', (q) => q.select('id', 'name', 'organization_id'))

    if (tasks.length === 0) {
      logger.info('ReminderEmailService.sendBoatCheckReminders: no targets')
      return
    }

    const tasksByOrg = new Map<number, ReminderTaskItem[]>()
    for (const task of tasks) {
      const orgId = task.boat.organizationId
      const list = tasksByOrg.get(orgId) ?? []
      list.push({
        id: task.id,
        title: task.title,
        boatName: task.boat.name,
        dueAt: task.dueAt?.toISO() ?? null,
      })
      tasksByOrg.set(orgId, list)
    }

    let sent = 0
    for (const [orgId, orgTasks] of tasksByOrg) {
      const admins = await OrganizationMembership.query()
        .where('organizationId', orgId)
        .where('role', 'admin')
        .preload('user')

      for (const membership of admins) {
        await this.emailQueueService.sendReminderBoatCheckTasks({
          to: membership.user.email,
          name: membership.user.fullName,
          tasks: orgTasks,
        })
        sent++
      }
    }

    logger.info({ sent }, 'ReminderEmailService.sendBoatCheckReminders: done')
  }
}
