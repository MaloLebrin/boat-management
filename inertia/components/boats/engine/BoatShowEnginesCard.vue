<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentEngineFields from './BoatEquipmentEngineFields.vue'
import type { BoatShowEngine } from '~/types/boat_show'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { ref } from 'vue'
import { useT } from '~/composables/useT'

defineProps<{
  boatId: number
  engines: BoatShowEngine[]
  canManage: boolean
}>()

const { t } = useT()
const isCreateOpen = ref(false)

function performedDisplay(iso: string | null) {
  if (!iso) return null
  const d = iso.slice(0, 10)
  return d || iso
}

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.engines.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          :aria-label="t('boats.engines.addEngine')"
          @click="isCreateOpen = true"
        >
          {{ t('boats.engines.addEngine') }}
        </BaseButton>
      </div>
    </template>
    <div v-if="engines.length === 0" class="text-sm text-fg-muted">{{ t('boats.engines.noEngines') }}</div>
    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="e in engines"
        :key="e.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-fg">{{ e.kind }}</p>
              <BaseBadge v-if="e.fuel" variant="neutral">
                {{ e.fuel }}
              </BaseBadge>
              <BaseBadge :variant="statusVariant(e.status)">
                {{ t(`equipment.status.${e.status}`) }}
              </BaseBadge>
            </div>

            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border">
                {{ e.brand ?? '—' }} {{ e.model ?? '' }}
              </span>
              <span
                v-if="e.powerHp !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ e.powerHp }} hp
              </span>
              <span
                v-if="e.hours !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ e.hours }} h
              </span>
            </div>

            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
              <span v-if="performedDisplay(e.manufacturedAt)">{{ t('boats.engines.mfg') }} {{ performedDisplay(e.manufacturedAt) }}</span>
              <span v-if="e.serialNumber">{{ t('boats.engines.sn') }} {{ e.serialNumber }}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 md:justify-end">
            <a :href="`/boats/${boatId}/engines/${e.id}`">
              <BaseButton variant="secondary" size="sm" type="button">
                {{ t('boats.engines.viewDetail') }}
              </BaseButton>
            </a>
            <a v-if="canManage" :href="`/boats/${boatId}/engines/${e.id}/edit`">
              <BaseButton variant="ghost" size="sm" type="button" :aria-label="t('boats.engines.edit')">
                {{ t('boats.engines.edit') }}
              </BaseButton>
            </a>
            <Form
              v-if="canManage"
              :action="{ url: `/boats/${boatId}/engines/${e.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing" :aria-label="t('boats.engines.delete')">
                {{ t('boats.engines.delete') }}
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <BaseModal v-model:open="isCreateOpen" :title="t('boats.engines.modal.title')" :close-label="t('common.close')">
      <Form
        :action="{ url: `/boats/${boatId}/engines`, method: 'post' }"
        @success="isCreateOpen = false"
        class="space-y-4"
        #default="{ processing, errors }"
      >
        <BoatEquipmentEngineFields :errors="errors" />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">{{ t('boats.engines.modal.cancel') }}</BaseButton>
          <BaseButton type="submit" :disabled="processing">{{ t('boats.engines.modal.submit') }}</BaseButton>
        </div>
      </Form>
    </BaseModal>
  </BaseCard>
</template>
