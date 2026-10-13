<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import PassageChecklist from '~/components/boats/show/PassageChecklist.vue'
import { useDateFormat } from '~/composables/use_date_format'
import {
  usePassagePreparation,
  type PassagePageState,
  type PassagePageStatus,
} from '~/composables/use_passage_preparation'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

/**
 * « Préparer la traversée » (#967, épic #949) : pré-charge les pages terrain
 * du bateau dans le cache du service worker et dresse la check-list du départ.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    /** Moteurs du bateau : leurs checklists de diagnostic sont pré-chargées (#981). */
    engines?: BoatShowEngine[]
  }>(),
  { engines: () => [] }
)

const open = defineModel<boolean>('open', { required: true })

const { t } = useT()
const { formatDateTime } = useDateFormat()
const { pages, isPreparing, serviceWorkerReady, prepare, refreshCachedDates } =
  usePassagePreparation(
    () => props.boatId,
    () => props.engines
  )

watch(open, (isOpen) => {
  if (isOpen) void refreshCachedDates()
})

function pageLabel(item: PassagePageState): string {
  const engine = props.engines.find((candidate) => candidate.id === item.engineId)
  return t(`boats.show.passage.pages.${item.key}`, {
    engine: engine ? engineDisplayTitle(t, engine) : '',
  })
}

function pageId(item: PassagePageState): string {
  return item.engineId === undefined ? item.key : `${item.key}-${item.engineId}`
}

const cachedAt = computed(() => pages.value.map((item) => item.cachedAt))

const STATUS_BADGE: Record<Exclude<PassagePageStatus, 'idle'>, 'info' | 'success' | 'danger'> = {
  loading: 'info',
  done: 'success',
  failed: 'danger',
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    size="lg"
    :title="t('boats.show.passage.title')"
    :subtitle="t('boats.show.passage.subtitle')"
  >
    <div class="space-y-6">
      <BaseAlert v-if="!serviceWorkerReady" variant="warning">
        {{ t('boats.show.passage.noServiceWorker') }}
      </BaseAlert>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-fg">{{ t('boats.show.passage.pagesTitle') }}</h3>
          <BaseButton
            size="sm"
            :disabled="isPreparing || !serviceWorkerReady"
            data-testid="passage-prepare"
            @click="prepare"
          >
            {{ isPreparing ? t('boats.show.passage.preparing') : t('boats.show.passage.prepare') }}
          </BaseButton>
        </div>
        <ul class="divide-y divide-border rounded-(--radius-control) border border-border">
          <li
            v-for="item in pages"
            :key="pageId(item)"
            class="flex items-center justify-between gap-3 px-4 py-2.5"
            :data-testid="`passage-page-${pageId(item)}`"
            :data-status="item.status"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-fg">
                {{ pageLabel(item) }}
              </p>
              <p class="text-xs text-fg-muted">
                {{
                  item.cachedAt
                    ? t('boats.show.passage.cachedAt', { date: formatDateTime(item.cachedAt) })
                    : t('boats.show.passage.notCached')
                }}
              </p>
            </div>
            <BaseBadge v-if="item.status !== 'idle'" :variant="STATUS_BADGE[item.status]">
              {{ t(`boats.show.passage.pageStatus.${item.status}`) }}
            </BaseBadge>
          </li>
        </ul>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-fg">{{ t('boats.show.passage.checklistTitle') }}</h3>
        <PassageChecklist :cached-at="cachedAt" />
      </section>
    </div>
  </BaseModal>
</template>
