<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useByteFormat } from '~/composables/use_byte_format'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { usePersistentStorage } from '~/composables/use_persistent_storage'
import { useT } from '~/composables/use_t'
import { evaluatePassageChecklist, type ChecklistStatus } from '~/lib/passage_preparation'
import { todayDateInputValue } from '~/utils/local_datetime'
import { REMEMBER_ME_DAYS, SESSION_IDLE_DAYS } from '../../../../shared/constants/auth'

/**
 * Check-list « Préparer la traversée » (#967) : ce qui doit être vrai avant de
 * perdre le réseau pour plusieurs semaines.
 */
const props = defineProps<{
  cachedAt: Array<Date | null>
}>()

const { t } = useT()
const { formatStorageSize } = useByteFormat()
const { persisted, estimate, refreshStorageEstimate } = usePersistentStorage()
const { pendingCount, failedCount } = useOfflineQueue()

const returnDate = ref('')
const today = todayDateInputValue()

onMounted(() => {
  void refreshStorageEstimate()
})

const checklist = computed(() =>
  evaluatePassageChecklist({
    persisted: persisted.value,
    estimate: estimate.value,
    cachedAt: props.cachedAt,
    pendingCount: pendingCount.value,
    failedCount: failedCount.value,
    returnDate: returnDate.value,
    today: new Date(),
  })
)

const cachedCount = computed(() => props.cachedAt.filter((date) => date !== null).length)

const BADGE: Record<ChecklistStatus, 'success' | 'warning' | 'neutral'> = {
  ok: 'success',
  warning: 'warning',
  unknown: 'neutral',
}

const items = computed(() => {
  const list = checklist.value
  const free = estimate.value ? Math.max(estimate.value.quota - estimate.value.usage, 0) : null
  return [
    {
      key: 'storage',
      status: list.storage,
      label: t('boats.show.passage.checklist.storage'),
      detail: t(`boats.show.passage.checklist.storageDetail.${list.storage}`),
    },
    {
      key: 'quota',
      status: list.quota,
      label: t('boats.show.passage.checklist.quota'),
      detail:
        free === null
          ? t('boats.show.passage.checklist.quotaUnknown')
          : t('boats.show.passage.checklist.quotaDetail', { free: formatStorageSize(free) }),
    },
    {
      key: 'pages',
      status: list.pages,
      label: t('boats.show.passage.checklist.pages'),
      detail: t('boats.show.passage.checklist.pagesDetail', {
        cached: String(cachedCount.value),
        total: String(props.cachedAt.length),
      }),
    },
    {
      key: 'queue',
      status: list.queue,
      label: t('boats.show.passage.checklist.queue'),
      detail:
        list.queue === 'ok'
          ? t('boats.show.passage.checklist.queueEmpty')
          : t('boats.show.passage.checklist.queuePending', {
              count: String(pendingCount.value + failedCount.value),
            }),
    },
    {
      key: 'session',
      status: list.session,
      label: t('boats.show.passage.checklist.session'),
      detail: t(`boats.show.passage.checklist.sessionDetail.${list.session}`, {
        days: String(SESSION_IDLE_DAYS),
        rememberDays: String(REMEMBER_ME_DAYS),
      }),
    },
  ]
})
</script>

<template>
  <div class="space-y-4">
    <BaseInput
      v-model="returnDate"
      type="date"
      name="passage-return-date"
      :min="today"
      :label="t('boats.show.passage.returnDate')"
      :hint="t('boats.show.passage.returnDateHint')"
    />
    <ul class="divide-y divide-border rounded-(--radius-control) border border-border">
      <li
        v-for="item in items"
        :key="item.key"
        class="flex items-start justify-between gap-3 px-4 py-3"
        :data-testid="`passage-check-${item.key}`"
        :data-status="item.status"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold text-fg">{{ item.label }}</p>
          <p class="text-sm text-fg-muted">{{ item.detail }}</p>
        </div>
        <BaseBadge :variant="BADGE[item.status]">
          {{ t(`boats.show.passage.status.${item.status}`) }}
        </BaseBadge>
      </li>
    </ul>
  </div>
</template>
