import { QuotaExceededError } from '#exceptions/quota_errors'
import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { PLAN_LIMITS, getUpgradeTier } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import StorageThresholdCrossed from '#events/storage_threshold_crossed'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class QuotaService {
  async countBoats(org: Organization): Promise<number> {
    const rows = await Boat.query().where('organizationId', org.id).count('* as total')
    return Number(rows[0].$extras.total)
  }

  async countMembers(org: Organization): Promise<number> {
    const rows = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .count('* as total')
    return Number(rows[0].$extras.total)
  }

  async canAddBoat(org: Organization): Promise<boolean> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxBoats === null) return true
    return (await this.countBoats(org)) < limits.maxBoats
  }

  async assertCanAddBoat(org: Organization): Promise<void> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxBoats === null) return

    const current = await this.countBoats(org)
    if (current >= limits.maxBoats) {
      throw new QuotaExceededError('boats', {
        limit: limits.maxBoats,
        current,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  async canAddMember(org: Organization): Promise<boolean> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxMembers === null) return true
    return (await this.countMembers(org)) < limits.maxMembers
  }

  async assertCanAddMember(org: Organization): Promise<void> {
    const limits = PLAN_LIMITS[org.plan]
    if (limits.maxMembers === null) return

    const current = await this.countMembers(org)
    if (current >= limits.maxMembers) {
      throw new QuotaExceededError('members', {
        limit: limits.maxMembers,
        current,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  assertCanUseAI(org: Organization): void {
    const limits = PLAN_LIMITS[org.plan]
    if (!limits.canUseAI) {
      throw new QuotaExceededError('ai', {
        limit: null,
        current: 0,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  canExport(org: Organization): boolean {
    return PLAN_LIMITS[org.plan].canExport
  }

  assertCanExport(org: Organization): void {
    const limits = PLAN_LIMITS[org.plan]
    if (!limits.canExport) {
      throw new QuotaExceededError('export', {
        limit: null,
        current: 0,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  assertCanManageClients(org: Organization): void {
    const limits = PLAN_LIMITS[org.plan]
    if (!limits.canManageClients) {
      throw new QuotaExceededError('clients', {
        limit: null,
        current: 0,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  storageLimitBytes(org: Organization): number | null {
    const gb = PLAN_LIMITS[org.plan].storageGb
    return gb === null ? null : gb * 1024 * 1024 * 1024
  }

  // Note: two concurrent uploads can both read a stale org.storageUsedBytes and both pass this
  // guard. The EmailQueueService correlationSuffix deduplication handles notification races; quota
  // enforcement relies on DB-level atomicity in updateStorageUsed (increment/decrement) rather than
  // this optimistic check.
  assertCanUpload(org: Organization, bytes: number): void {
    const limit = this.storageLimitBytes(org)
    if (limit === null) return
    if (org.storageUsedBytes > limit) {
      // Already over limit (post-downgrade): even a 0-byte upload is blocked
      throw new QuotaExceededError('storage', {
        limit,
        current: org.storageUsedBytes,
        upgradeTo: getUpgradeTier(org.plan),
        alreadyOverLimit: true,
      })
    }
    if (org.storageUsedBytes + bytes > limit) {
      throw new QuotaExceededError('storage', {
        limit,
        current: org.storageUsedBytes,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  async updateStorageUsed(org: Organization, deltaBytes: number): Promise<void> {
    const limit = this.storageLimitBytes(org)

    // Calculate percentages before and after the update
    const oldBytes = org.storageUsedBytes
    const newBytes = Math.max(0, oldBytes + deltaBytes)

    // Update storage atomically in DB (use snake_case column name)
    if (deltaBytes >= 0) {
      await Organization.query().where('id', org.id).increment('storage_used_bytes', deltaBytes)
    } else {
      // GREATEST(0, …) ensures the column never goes below 0 — fully atomic, no read-then-write race
      await Organization.query()
        .where('id', org.id)
        .update({
          storage_used_bytes: db.raw('GREATEST(0, storage_used_bytes - ?)', [Math.abs(deltaBytes)]),
        })
    }

    // Refresh the organization in-place so the caller's reference reflects the new value.
    await org.refresh()

    // Only check for threshold notifications if adding bytes (not deleting)
    // Note: oldPercent/newPercent are derived from the pre-update in-memory value. Under concurrent
    // uploads two requests could both see oldPercent < 80 and both trigger the 80% email. The
    // correlationSuffix deduplication in EmailQueueService (one email per threshold per month)
    // is the intended safety net for this race window.
    if (deltaBytes > 0 && limit !== null) {
      const oldPercent = (oldBytes / limit) * 100
      const newPercent = (newBytes / limit) * 100

      // Check if we crossed 80% or 100% threshold
      const crossed80 = oldPercent < 80 && newPercent >= 80
      const crossed100 = oldPercent < 100 && newPercent >= 100

      if (crossed80) {
        StorageThresholdCrossed.dispatch(org, 80)
      }
      if (crossed100) {
        StorageThresholdCrossed.dispatch(org, 100)
      }
    }
  }
}
