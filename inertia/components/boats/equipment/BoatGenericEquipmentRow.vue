<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowGenericEquipment } from '~/types/boat_show'

defineProps<{
  boatId: number
  item: BoatShowGenericEquipment
  canManage: boolean
  canManageActions: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', item: BoatShowGenericEquipment): void
  (e: 'addToActions', item: BoatShowGenericEquipment): void
}>()

const { t } = useT()

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'to_check') return 'warning'
  return 'danger'
}
</script>

<template>
  <li class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="truncate text-sm font-semibold text-fg">{{ item.name }}</p>
          <BaseBadge :variant="statusVariant(item.status)">
            {{ t(`boats.options.genericEquipmentStatus.${item.status}`) }}
          </BaseBadge>
        </div>

        <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
          <span
            v-if="item.brand"
            class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
          >
            {{ item.brand }}
          </span>
          <span
            v-if="item.model"
            class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
          >
            {{ item.model }}
          </span>
          <span
            v-if="item.quantity !== null"
            class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
          >
            {{ t('boats.genericEquipment.quantity') }}: {{ item.quantity }}
          </span>
        </div>

        <p v-if="item.notes" class="mt-2 text-xs text-fg-muted">{{ item.notes }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <BaseButton
          v-if="canManageActions && item.status !== 'ok'"
          variant="secondary"
          size="sm"
          type="button"
          @click="emit('addToActions', item)"
        >
          {{ t('equipmentActions.prefill.addButton') }}
        </BaseButton>
        <template v-if="canManage">
          <BaseButton
            variant="ghost"
            size="sm"
            type="button"
            :aria-label="t('boats.genericEquipment.edit')"
            @click="emit('edit', item)"
          >
            {{ t('boats.genericEquipment.edit') }}
          </BaseButton>
          <Form
            :action="{
              url: `/boats/${boatId}/generic-equipment/${item.id}`,
              method: 'delete',
            }"
            #default="{ processing }"
            class="inline"
          >
            <BaseButton
              type="submit"
              variant="danger"
              size="sm"
              :disabled="processing"
              :aria-label="t('boats.genericEquipment.delete')"
            >
              {{ t('boats.genericEquipment.delete') }}
            </BaseButton>
          </Form>
        </template>
      </div>
    </div>
  </li>
</template>
