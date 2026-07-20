import AiTokenUsage from '#models/ai_token_usage'
import Organization from '#models/organization'
import { DateTime } from 'luxon'

/** Sets the org's storage usage directly (mirrors the pattern used in quota tests). */
export async function ensureStorageUsed(orgId: number, bytes: number): Promise<void> {
  const org = await Organization.findOrFail(orgId)
  await org.merge({ storageUsedBytes: bytes }).save()
}

/** Sets the org's AI token usage for the current month (idempotent, upsert). */
export async function ensureAiTokenUsage(orgId: number, tokensUsed: number): Promise<void> {
  const month = DateTime.now().toFormat('yyyy-MM')
  await AiTokenUsage.updateOrCreate({ organizationId: orgId, month }, { tokensUsed })
}
