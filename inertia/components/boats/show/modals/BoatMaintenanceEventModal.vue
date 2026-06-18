<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BoatMaintenanceSubjectFields from './BoatMaintenanceSubjectFields.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'
import type { MaintenanceTaskSubject } from '../../../../shared/types/maintenance'

const props = defineProps<{
  boat: BoatShowDetail
  canManageMaintenance: boolean
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const subject = ref<MaintenanceTaskSubject>('boat')
const boatEngineId = ref<string>('')
const boatSailId = ref<string>('')
const boatSafetyEquipmentId = ref<string>('')
const engineCaptionManual = ref('')
const sailCaptionManual = ref('')
const partRows = ref<Array<{ name: string; quantity: string; notes: string }>>([])
const performedAt = ref('')
const entryTitle = ref('')
const entryNotes = ref('')

const subjectOptions = computed<ReadonlyArray<{ label: string; value: MaintenanceTaskSubject }>>(
  () => [
    { label: t('boats.maintenance.events.wholeBoat'), value: 'boat' },
    { label: t('boats.maintenance.events.hull'), value: 'hull' },
    { label: t('boats.maintenance.events.engine'), value: 'engine' },
    { label: t('boats.maintenance.events.sail'), value: 'sail' },
    { label: t('boats.maintenance.events.rig'), value: 'rig' },
    { label: t('boats.maintenance.events.electrical'), value: 'electrical' },
    { label: t('boats.maintenance.events.plumbing'), value: 'plumbing' },
    { label: t('boats.maintenance.events.safety'), value: 'safety' },
    { label: t('boats.maintenance.events.deck'), value: 'deck' },
    { label: t('boats.maintenance.events.other'), value: 'other' },
  ]
)

watch(subject, () => {
  boatEngineId.value = ''
  boatSailId.value = ''
  boatSafetyEquipmentId.value = ''
  engineCaptionManual.value = ''
  sailCaptionManual.value = ''
  entryTitle.value = ''
  entryNotes.value = ''
  partRows.value = []
})

function addPartRow() {
  partRows.value.push({ name: '', quantity: '', notes: '' })
}

function removePartRow(index: number) {
  partRows.value.splice(index, 1)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('boats.maintenance.events.addEntry')"
    :subtitle="`${boat.name} · ${t('boats.maintenance.events.subtitle') || 'Enregistrement immuable une fois sauvegardé'}`"
    close-label="Annuler"
    size="xl"
    @update:open="close"
  >
    <Form
      :action="{ url: `/boats/${boat.id}/maintenance`, method: 'post' }"
      @success="close"
      class="space-y-4"
      #default="{ processing, errors }"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseSelect
          id="maint-subject"
          name="subject"
          :label="t('boats.maintenance.events.subject')"
          :options="subjectOptions"
          v-model="subject"
          :errors="errors"
        />

        <BaseInput
          id="maint-performed-at"
          name="performedAt"
          :label="t('boats.maintenance.events.performedAt')"
          type="date"
          required
          v-model="performedAt"
          :errors="errors"
        />
      </div>

      <BoatMaintenanceSubjectFields
        :boat="boat"
        :subject="subject"
        :errors="errors"
        v-model:boat-engine-id="boatEngineId"
        v-model:boat-sail-id="boatSailId"
        v-model:boat-safety-equipment-id="boatSafetyEquipmentId"
        v-model:engine-caption-manual="engineCaptionManual"
        v-model:sail-caption-manual="sailCaptionManual"
      />

      <BaseInput
        id="maint-title"
        name="title"
        :label="t('boats.maintenance.events.titleField')"
        required
        :placeholder="t('boats.maintenance.events.titlePlaceholder')"
        v-model="entryTitle"
        :errors="errors"
      />

      <BaseTextarea
        id="maint-notes"
        name="notes"
        :label="t('boats.maintenance.events.notes')"
        :rows="3"
        v-model="entryNotes"
        :errors="errors"
      />

      <!-- Parts section -->
      <div class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.events.parts') }}</p>
          <BaseButton variant="secondary" size="sm" type="button" @click="addPartRow">
            {{ t('boats.maintenance.events.addPart') }}
          </BaseButton>
        </div>
        <div v-if="partRows.length === 0" class="mt-3 text-sm text-fg-muted">
          {{ t('boats.maintenance.events.noParts') }}
        </div>
        <div v-else class="mt-4 space-y-3">
          <div v-for="(p, idx) in partRows" :key="idx" class="grid gap-3 sm:grid-cols-6">
            <div class="sm:col-span-3">
              <BaseInput
                :id="`part-name-${idx}`"
                :name="`parts[${idx}][name]`"
                :label="t('boats.maintenance.events.partName')"
                v-model="p.name"
              />
            </div>
            <div class="sm:col-span-1">
              <BaseInput
                :id="`part-qty-${idx}`"
                :name="`parts[${idx}][quantity]`"
                :label="t('boats.maintenance.events.partQty')"
                inputmode="numeric"
                type="number"
                min="1"
                step="1"
                v-model="p.quantity"
              />
            </div>
            <div class="sm:col-span-2">
              <BaseInput
                :id="`part-notes-${idx}`"
                :name="`parts[${idx}][notes]`"
                :label="t('boats.maintenance.events.partNotes')"
                v-model="p.notes"
              />
            </div>
            <div class="sm:col-span-6 flex justify-end">
              <BaseButton variant="ghost" size="sm" type="button" @click="removePartRow(idx)">
                {{ t('boats.maintenance.events.removePart') }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <p
        class="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-fg-muted"
      >
        ⓘ
        {{
          t('boats.maintenance.events.immutable') ||
          'Une fois enregistré, cet événement devient immuable.'
        }}
      </p>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('boats.maintenance.tasks.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="processing || (subject === 'rig' && !boat.rig)">
          {{ t('boats.maintenance.events.createEntry') }}
        </BaseButton>
      </div>
    </Form>
  </BaseModal>
</template>
