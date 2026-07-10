<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatSafetyEquipmentDetail } from '~/types/boat_show'

defineProps<{ item: BoatSafetyEquipmentDetail }>()

const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.safetyEquipmentShow.fields.equipmentType') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">
          {{ t(`boats.options.safetyEquipmentType.${item.equipmentType}`) }}
        </dd>
      </div>
      <div v-if="item.quantity !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.safetyEquipment.quantity') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ item.quantity }}</dd>
      </div>
      <div v-if="item.expiryDate">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.safetyEquipmentShow.fields.expiryDate') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ item.expiryDate }}</dd>
      </div>
      <div v-if="item.purchasePrice !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('equipment.purchasePrice') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ item.purchasePrice }}</dd>
      </div>
      <div v-if="item.purchasedAt">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('equipment.purchasedAt') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ item.purchasedAt }}</dd>
      </div>
    </dl>

    <div v-if="item.notes" class="mt-6 border-t border-border pt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('equipment.notes') }}
      </p>
      <p class="mt-1 whitespace-pre-line text-sm text-fg-muted">{{ item.notes }}</p>
    </div>
  </BaseCard>
</template>
