<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { PencilSquareIcon, PlusCircleIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { BoatShowRig } from '~/types/boat_show'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { rigTypeLabel } from '~/utils/boat_enum_labels'

defineProps<{
  boatId: number
  rig: BoatShowRig | null
  canManage: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

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
      <div class="flex flex-wrap items-start justify-between gap-2">
        <p class="text-sm font-semibold text-fg">{{ t('boats.rig.title') }}</p>
        <div v-if="canManage" class="flex flex-wrap items-center gap-2">
          <a
            :href="`/boats/${boatId}/rig/edit`"
            :aria-label="rig ? t('boats.rig.editTitle') : t('boats.rig.addTitle')"
            class="flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
          >
            <PencilSquareIcon v-if="rig" class="w-4 h-4" />
            <PlusCircleIcon v-else class="w-4 h-4" />
            {{ rig ? t('boats.rig.editTitle') : t('boats.rig.addTitle') }}
          </a>
          <Form
            v-if="rig"
            :action="{ url: `/boats/${boatId}/rig`, method: 'delete' }"
            #default="{ processing }"
            class="inline"
          >
            <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
              <TrashIcon class="w-4 h-4 text-red-800" />
            </BaseButton>
          </Form>
        </div>
      </div>
    </template>

    <div v-if="!rig" class="text-sm text-fg-muted">{{ t('boats.rig.noRig') }}</div>
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <BaseBadge :variant="statusVariant(rig.status)">
          {{ t(`equipment.status.${rig.status}`) }}
        </BaseBadge>
        <BaseButton variant="ghost" size="sm" route="boats.rig.show" :params="{ boatId }">
          {{ t('boats.rig.viewDetail') }}
        </BaseButton>
      </div>
      <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt class="text-fg-muted">{{ t('boats.rig.fields.rigType') }}</dt>
          <dd class="font-semibold text-fg">{{ rigTypeLabel(t, rig.rigType) }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('boats.rig.fields.mastCount') }}</dt>
          <dd class="font-semibold text-fg">{{ rig.mastCount ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('boats.rig.fields.spreaders') }}</dt>
          <dd class="font-semibold text-fg">{{ rig.spreaders ?? '—' }}</dd>
        </div>
        <div v-if="rig.manufacturedAt">
          <dt class="text-fg-muted">{{ t('boats.rig.fields.manufacturedAt') }}</dt>
          <dd class="font-semibold text-fg">{{ formatDate(rig.manufacturedAt) }}</dd>
        </div>
      </dl>
    </template>
  </BaseCard>
</template>
