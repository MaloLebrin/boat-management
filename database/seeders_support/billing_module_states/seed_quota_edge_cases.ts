import { PLAN_LIMITS } from '#shared/types/plan'
import {
  ensureBoats,
  ensureOwner,
} from '#database/seeders_support/billing_module_states/org_helpers'
import { ensureSubscription } from '#database/seeders_support/billing_module_states/subscription_helpers'
import {
  ensureAiTokenUsage,
  ensureStorageUsed,
} from '#database/seeders_support/billing_module_states/quota_helpers'

/** Cas limites de quota du plan Pro : stockage, tokens IA, nombre de bateaux. */
export async function seedQuotaEdgeCases(): Promise<void> {
  const storageLimitBytesPro = PLAN_LIMITS.pro.storageGb! * 1024 * 1024 * 1024

  const { org: storage80Org } = await ensureOwner(
    'pro-quota-storage-80@test.local',
    'Simon Storage80',
    'pro'
  )
  await ensureSubscription(storage80Org.id, 'pro', 'active')
  await ensureStorageUsed(storage80Org.id, Math.round(storageLimitBytesPro * 0.8))
  await ensureBoats(storage80Org.id, 1, 'Storage80 Boat')
  console.log(`✓ pro-quota-storage-80 — stockage à 80% du quota Pro (20GB)`)

  const { org: storage100Org } = await ensureOwner(
    'pro-quota-storage-100@test.local',
    'Sara Storage100',
    'pro'
  )
  await ensureSubscription(storage100Org.id, 'pro', 'active')
  await ensureStorageUsed(storage100Org.id, Math.round(storageLimitBytesPro * 1.02))
  await ensureBoats(storage100Org.id, 1, 'Storage100 Boat')
  console.log(`✓ pro-quota-storage-100 — stockage au-delà du quota Pro (20GB)`)

  const { org: aiNearLimitOrg } = await ensureOwner(
    'pro-quota-ai-near-limit@test.local',
    'Amir AiTokens',
    'pro'
  )
  await ensureSubscription(aiNearLimitOrg.id, 'pro', 'active')
  await ensureAiTokenUsage(aiNearLimitOrg.id, Math.round(PLAN_LIMITS.pro.aiTokensPerMonth! * 0.85))
  await ensureBoats(aiNearLimitOrg.id, 1, 'AiTokens Boat')
  console.log(`✓ pro-quota-ai-near-limit — 85% du quota mensuel de tokens IA Pro`)

  const { org: boatsAtLimitOrg } = await ensureOwner(
    'pro-quota-boats-at-limit@test.local',
    'Bilal BoatsLimit',
    'pro'
  )
  await ensureSubscription(boatsAtLimitOrg.id, 'pro', 'active')
  await ensureBoats(boatsAtLimitOrg.id, PLAN_LIMITS.pro.maxBoats!, 'AtLimit Boat')
  console.log(
    `✓ pro-quota-boats-at-limit — exactement ${PLAN_LIMITS.pro.maxBoats} bateaux (plafond Pro)`
  )
}
