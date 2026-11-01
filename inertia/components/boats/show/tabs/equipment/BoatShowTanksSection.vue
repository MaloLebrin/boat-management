<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { useForm } from '@inertiajs/vue3'
import { ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import TankFormFields from '~/components/boats/show/tabs/equipment/TankFormFields.vue'
import { useT } from '~/composables/use_t'
import type { BoatTankRow } from '~/types/boat_show'
import type { TankType } from '#shared/constants/tanks'

interface TankFormData {
  name: string
  type: TankType
  capacityL: string
  lowLevelPct: string
  instrumentKey: string
}

const props = defineProps<{
  boatId: number
  tanks: BoatTankRow[]
  canManage: boolean
}>()

const { t } = useT()

const isCreateOpen = ref(false)
const editingTank = ref<BoatTankRow | null>(null)

const createForm = useForm<TankFormData>({
  name: '',
  type: 'fuel',
  capacityL: '',
  lowLevelPct: '',
  instrumentKey: '',
})

const editForm = useForm<TankFormData>({
  name: '',
  type: 'fuel',
  capacityL: '',
  lowLevelPct: '',
  instrumentKey: '',
})

watch(editingTank, (tank) => {
  if (tank) {
    editForm.name = tank.name
    editForm.type = tank.type
    editForm.capacityL = tank.capacityL?.toString() ?? ''
    editForm.lowLevelPct = tank.lowLevelPct?.toString() ?? ''
    editForm.instrumentKey = tank.instrumentKey ?? ''
  }
})

function resetCreateForm() {
  createForm.name = ''
  createForm.type = 'fuel'
  createForm.capacityL = ''
  createForm.lowLevelPct = ''
  createForm.instrumentKey = ''
}

function transformForm(data: TankFormData) {
  return {
    name: data.name,
    type: data.type,
    capacityL: data.capacityL ? Number(data.capacityL) : null,
    lowLevelPct: data.lowLevelPct ? Number(data.lowLevelPct) : null,
    instrumentKey: data.instrumentKey || null,
  }
}

function submitCreate() {
  createForm.transform(transformForm).post(`/boats/${props.boatId}/tanks`, {
    preserveScroll: true,
    onSuccess: () => {
      isCreateOpen.value = false
      resetCreateForm()
    },
  })
}

function submitEdit() {
  if (!editingTank.value) return
  editForm.transform(transformForm).put(`/boats/${props.boatId}/tanks/${editingTank.value.id}`, {
    preserveScroll: true,
    onSuccess: () => {
      editingTank.value = null
    },
  })
}
</script>

<template>
  <BaseCard padded data-testid="tanks-section">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.tanks.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          data-testid="tanks-add"
          @click="isCreateOpen = true"
        >
          {{ t('boats.tanks.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="tanks.length === 0" class="text-sm text-fg-muted" data-testid="tanks-empty">
      {{ t('boats.tanks.empty') }}
    </div>

    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="tank in tanks"
        :key="tank.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
        data-testid="tank-row"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-fg">{{ tank.name }}</p>
            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border">
                {{ t(`boats.tanks.type.${tank.type}`) }}
              </span>
              <span
                v-if="tank.capacityL"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ tank.capacityL }} L
              </span>
              <span
                v-if="tank.lowLevelPct"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.tanks.lowLevelLabel', { pct: String(tank.lowLevelPct) }) }}
              </span>
            </div>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2 md:justify-end">
            <BaseButton variant="ghost" size="sm" type="button" @click="editingTank = tank">
              {{ t('common.edit') }}
            </BaseButton>
            <Form
              :action="{ url: `/boats/${boatId}/tanks/${tank.id}`, method: 'delete' }"
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

    <BaseModal v-model:open="isCreateOpen" :title="t('boats.tanks.modal.title')">
      <form class="space-y-4" data-testid="tank-create-form" @submit.prevent="submitCreate">
        <TankFormFields
          v-model:name="createForm.name"
          v-model:type="createForm.type"
          v-model:capacity-l="createForm.capacityL"
          v-model:low-level-pct="createForm.lowLevelPct"
          v-model:instrument-key="createForm.instrumentKey"
          :errors="createForm.errors"
        />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="createForm.processing">
            {{ t('boats.tanks.modal.submit') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="editingTank !== null"
      :title="t('boats.tanks.modal.editTitle')"
      @update:open="editingTank = null"
    >
      <form class="space-y-4" data-testid="tank-edit-form" @submit.prevent="submitEdit">
        <TankFormFields
          v-model:name="editForm.name"
          v-model:type="editForm.type"
          v-model:capacity-l="editForm.capacityL"
          v-model:low-level-pct="editForm.lowLevelPct"
          v-model:instrument-key="editForm.instrumentKey"
          :errors="editForm.errors"
        />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="editingTank = null">
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
