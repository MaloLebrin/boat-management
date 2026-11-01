<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { useForm } from '@inertiajs/vue3'
import { ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BatteryFormFields from '~/components/boats/show/tabs/equipment/BatteryFormFields.vue'
import { useT } from '~/composables/use_t'
import type { BoatBatteryRow } from '~/types/boat_show'

interface BatteryFormData {
  name: string
  chemistry: string
  capacityAh: string
  nominalVoltage: string
  lowVoltageV: string
  instrumentKey: string
}

const props = defineProps<{
  boatId: number
  batteries: BoatBatteryRow[]
  canManage: boolean
}>()

const { t } = useT()

const isCreateOpen = ref(false)
const editingBattery = ref<BoatBatteryRow | null>(null)

const createForm = useForm<BatteryFormData>({
  name: '',
  chemistry: '',
  capacityAh: '',
  nominalVoltage: '',
  lowVoltageV: '',
  instrumentKey: '',
})

const editForm = useForm<BatteryFormData>({
  name: '',
  chemistry: '',
  capacityAh: '',
  nominalVoltage: '',
  lowVoltageV: '',
  instrumentKey: '',
})

watch(editingBattery, (battery) => {
  if (battery) {
    editForm.name = battery.name
    editForm.chemistry = battery.chemistry ?? ''
    editForm.capacityAh = battery.capacityAh?.toString() ?? ''
    editForm.nominalVoltage = battery.nominalVoltage?.toString() ?? ''
    editForm.lowVoltageV = battery.lowVoltageV?.toString() ?? ''
    editForm.instrumentKey = battery.instrumentKey ?? ''
  }
})

function resetCreateForm() {
  createForm.name = ''
  createForm.chemistry = ''
  createForm.capacityAh = ''
  createForm.nominalVoltage = ''
  createForm.lowVoltageV = ''
  createForm.instrumentKey = ''
}

function transformForm(data: BatteryFormData) {
  return {
    name: data.name,
    chemistry: data.chemistry || null,
    capacityAh: data.capacityAh ? Number(data.capacityAh) : null,
    nominalVoltage: data.nominalVoltage ? Number(data.nominalVoltage) : null,
    lowVoltageV: data.lowVoltageV ? Number(data.lowVoltageV) : null,
    instrumentKey: data.instrumentKey || null,
  }
}

function submitCreate() {
  createForm.transform(transformForm).post(`/boats/${props.boatId}/batteries`, {
    preserveScroll: true,
    onSuccess: () => {
      isCreateOpen.value = false
      resetCreateForm()
    },
  })
}

function submitEdit() {
  if (!editingBattery.value) return
  editForm
    .transform(transformForm)
    .put(`/boats/${props.boatId}/batteries/${editingBattery.value.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        editingBattery.value = null
      },
    })
}
</script>

<template>
  <BaseCard padded data-testid="batteries-section">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.batteries.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          data-testid="batteries-add"
          @click="isCreateOpen = true"
        >
          {{ t('boats.batteries.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="batteries.length === 0" class="text-sm text-fg-muted" data-testid="batteries-empty">
      {{ t('boats.batteries.empty') }}
    </div>

    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="battery in batteries"
        :key="battery.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
        data-testid="battery-row"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-fg">{{ battery.name }}</p>
            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span
                v-if="battery.chemistry"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t(`boats.batteries.chemistry.${battery.chemistry}`) }}
              </span>
              <span
                v-if="battery.capacityAh"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ battery.capacityAh }} Ah
              </span>
              <span
                v-if="battery.nominalVoltage"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ battery.nominalVoltage }} V
              </span>
              <span
                v-if="battery.lowVoltageV"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.batteries.lowVoltageLabel', { voltage: String(battery.lowVoltageV) }) }}
              </span>
            </div>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2 md:justify-end">
            <BaseButton variant="ghost" size="sm" type="button" @click="editingBattery = battery">
              {{ t('common.edit') }}
            </BaseButton>
            <Form
              :action="{ url: `/boats/${boatId}/batteries/${battery.id}`, method: 'delete' }"
              class="inline"
              #default="{ processing }"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                {{ t('common.delete') }}
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <BaseModal v-model:open="isCreateOpen" :title="t('boats.batteries.modal.title')">
      <form class="space-y-4" data-testid="battery-create-form" @submit.prevent="submitCreate">
        <BatteryFormFields
          v-model:name="createForm.name"
          v-model:chemistry="createForm.chemistry"
          v-model:capacity-ah="createForm.capacityAh"
          v-model:nominal-voltage="createForm.nominalVoltage"
          v-model:low-voltage-v="createForm.lowVoltageV"
          v-model:instrument-key="createForm.instrumentKey"
          :errors="createForm.errors"
        />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="createForm.processing">
            {{ t('boats.batteries.modal.submit') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="editingBattery !== null"
      :title="t('boats.batteries.modal.editTitle')"
      @update:open="editingBattery = null"
    >
      <form class="space-y-4" data-testid="battery-edit-form" @submit.prevent="submitEdit">
        <BatteryFormFields
          v-model:name="editForm.name"
          v-model:chemistry="editForm.chemistry"
          v-model:capacity-ah="editForm.capacityAh"
          v-model:nominal-voltage="editForm.nominalVoltage"
          v-model:low-voltage-v="editForm.lowVoltageV"
          v-model:instrument-key="editForm.instrumentKey"
          :errors="editForm.errors"
        />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="editingBattery = null">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="editForm.processing">
            {{ t('common.save') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </BaseCard>
</template>
