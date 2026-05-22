import { QuotaExceededError } from '#exceptions/quota_errors'
import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { PLAN_LIMITS, getUpgradeTier } from '#shared/types/plan'
import { inject } from '@adonisjs/core'

@inject()
export default class QuotaService {
  async canAddBoat(org: Organization): Promise<boolean> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxBoats === null) return true
    const rows = await Boat.query().where('organizationId', org.id).count('* as total')
    return Number(rows[0].$extras.total) < limits.maxBoats
  }

  async assertCanAddBoat(org: Organization): Promise<void> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxBoats === null) return

    const rows = await Boat.query().where('organizationId', org.id).count('* as total')
    const current = Number(rows[0].$extras.total)

    if (current >= limits.maxBoats) {
      throw new QuotaExceededError('boats', limits.maxBoats, current, getUpgradeTier(org.plan))
    }
  }

  async assertCanAddMember(org: Organization): Promise<void> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxMembers === null) return

    const rows = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .count('* as total')
    const current = Number(rows[0].$extras.total)

    if (current >= limits.maxMembers) {
      throw new QuotaExceededError('members', limits.maxMembers, current, getUpgradeTier(org.plan))
    }
  }

  assertCanUseAI(org: Organization): void {
    const limits = PLAN_LIMITS[org.plan]
    if (!limits.canUseAI) {
      throw new QuotaExceededError('ai', 0, 0, getUpgradeTier(org.plan))
    }
  }

  assertCanExport(org: Organization): void {
    const limits = PLAN_LIMITS[org.plan]
    if (!limits.canExport) {
      throw new QuotaExceededError('export', 0, 0, getUpgradeTier(org.plan))
    }
  }
}
