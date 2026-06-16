import { QuotaExceededError } from '#exceptions/quota_errors'
import AiTokenUsage from '#models/ai_token_usage'
import type Organization from '#models/organization'
import AiTokenThresholdCrossed from '#events/ai_token_threshold_crossed'
import { PLAN_LIMITS, getUpgradeTier } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

@inject()
export default class AiTokenQuotaService {
  currentMonthKey(): string {
    return DateTime.now().toFormat('yyyy-MM')
  }

  async getUsage(organizationId: number, month?: string): Promise<number> {
    const key = month ?? this.currentMonthKey()
    const row = await AiTokenUsage.query()
      .where('organizationId', organizationId)
      .where('month', key)
      .first()
    return row ? Number(row.tokensUsed) : 0
  }

  assertCanUseTokens(org: Organization, currentUsage: number): void {
    const limit = PLAN_LIMITS[org.plan].aiTokensPerMonth
    if (limit === null) return
    if (currentUsage >= limit) {
      throw new QuotaExceededError('ai_tokens', {
        limit,
        current: currentUsage,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  async recordUsage(org: Organization, tokensUsed: number): Promise<void> {
    if (tokensUsed <= 0) return

    const month = this.currentMonthKey()
    const limit = PLAN_LIMITS[org.plan].aiTokensPerMonth

    const existing = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()

    const oldUsed = existing ? Number(existing.tokensUsed) : 0

    if (existing) {
      await AiTokenUsage.query()
        .where('organizationId', org.id)
        .where('month', month)
        .update({ tokens_used: db.raw('tokens_used + ?', [tokensUsed]) })
    } else {
      await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed })
    }

    if (limit !== null) {
      const newUsed = oldUsed + tokensUsed
      const oldPercent = (oldUsed / limit) * 100
      const newPercent = (newUsed / limit) * 100

      if (oldPercent < 80 && newPercent >= 80) {
        AiTokenThresholdCrossed.dispatch(org, 80)
      }
      if (oldPercent < 100 && newPercent >= 100) {
        AiTokenThresholdCrossed.dispatch(org, 100)
      }
    }
  }

  async resetMonth(month: string): Promise<void> {
    await AiTokenUsage.query().where('month', month).delete()
  }
}
