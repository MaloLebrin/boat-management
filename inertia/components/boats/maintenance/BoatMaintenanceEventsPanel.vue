<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatShowDetail, MaintenanceEventRow } from '~/types/boat_show'
import { performedDisplay, subjectLabel, targetDescription } from './utils'
import { useT } from '~/composables/useT'

const { t } = useT()

type Subject = 'boat' | 'engine' | 'sail' | 'rig'

const props = defineProps<{
  boat: BoatShowDetail
  events: MaintenanceEventRow[]
  canManageMaintenance: boolean
}>()

const subject = ref<Subject>('boat')
const boatEngineId = ref<string>('')
const boatSailId = ref<string>('')
const engineCaptionManual = ref('')
const sailCaptionManual = ref('')
const partRows = ref<Array<{ name: string; quantity: string; notes: string }>>([])
const performedAt = ref('')
const entryTitle = ref('')
const entryNotes = ref('')

const subjectOptions = computed<ReadonlyArray<{ label: string; value: Subject }>>(() => [
  { label: t('boats.maintenance.events.wholeBoat'), value: 'boat' },
  { label: t('boats.maintenance.events.engine'), value: 'engine' },
  { label: t('boats.maintenance.events.sail'), value: 'sail' },
  { label: t('boats.maintenance.events.rig'), value: 'rig' },
])

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim(),
  }))
)

const sailOptions = computed(() =>
  props.boat.sails.map((s) => ({
    value: String(s.id),
    label: `${s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
  }))
)

watch(subject, () => {
  boatEngineId.value = ''
  boatSailId.value = ''
  engineCaptionManual.value = ''
  sailCaptionManual.value = ''
  performedAt.value = ''
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
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="space-y-1">
        <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.events.title') }}</p>
        <p class="text-sm text-fg-muted">{{ t('boats.maintenance.events.subtitle') }}</p>
      </div>
    </template>

    <div v-if="events.length === 0" class="text-sm text-fg-muted">{{ t('boats.maintenance.events.empty') }}</div>
    <ul v-else class="space-y-4">
      <li
        v-for="ev in events"
        :key="ev.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 text-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-fg">{{ performedDisplay(ev.performedAt) }} — {{ ev.title }}</p>
            <p class="text-fg-muted">{{ subjectLabel(ev.subject) }} · {{ targetDescription(ev) }}</p>
            <p v-if="ev.notes" class="mt-2 text-fg-muted">{{ ev.notes }}</p>
            <ul v-if="ev.parts.length" class="mt-2 list-inside list-disc text-fg-muted">
              <li v-for="p in ev.parts" :key="p.id">
                {{ p.name }}<template v-if="p.quantity !== null"> × {{ p.quantity }}</template>
                <template v-if="p.notes"> — {{ p.notes }}</template>
              </li>
            </ul>
          </div>
          <Form
            v-if="canManageMaintenance"
            :action="{ url: `/boats/${boat.id}/maintenance/${ev.id}`, method: 'delete' }"
            #default="{ processing }"
          >
            <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
              <TrashIcon class="w-4 h-4 text-red-800" />
            </BaseButton>
          </Form>
        </div>
      </li>
    </ul>

    <div v-if="canManageMaintenance" id="maintenance-add-entry" class="mt-6 border-t border-border pt-6">
      <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.events.addEntry') }}</p>
      <Form
        :action="{ url: `/boats/${boat.id}/maintenance`, method: 'post' }"
        class="mt-4 space-y-4"
        #default="{ processing, errors }"
      >
        <BaseSelect
          id="maint-subject"
          name="subject"
          :label="t('boats.maintenance.events.subject')"
          :options="subjectOptions"
          v-model="subject"
          :errors="errors"
        />

        <template v-if="subject === 'engine'">
          <BaseSelect
            v-if="engineOptions.length"
            id="maint-engine"
            name="boatEngineId"
            :label="t('boats.maintenance.events.engine')"
            :placeholder="t('boats.maintenance.events.selectPlaceholder')"
            :allow-empty="true"
            :options="engineOptions"
            v-model="boatEngineId"
            :errors="errors"
          />
          <BaseInput
            id="maint-engine-caption"
            name="engineCaption"
            :label="t('boats.maintenance.events.label')"
            :placeholder="t('boats.maintenance.events.enginePlaceholder')"
            v-model="engineCaptionManual"
            :errors="errors"
          />
        </template>

        <template v-if="subject === 'sail'">
          <BaseSelect
            v-if="sailOptions.length"
            id="maint-sail"
            name="boatSailId"
            :label="t('boats.maintenance.events.sail')"
            :placeholder="t('boats.maintenance.events.selectPlaceholder')"
            :allow-empty="true"
            :options="sailOptions"
            v-model="boatSailId"
            :errors="errors"
          />
          <BaseInput
            id="maint-sail-caption"
            name="sailCaption"
            :label="t('boats.maintenance.events.label')"
            :placeholder="t('boats.maintenance.events.sailPlaceholder')"
            v-model="sailCaptionManual"
            :errors="errors"
          />
        </template>

        <template v-if="subject === 'rig'">
          <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
          <p v-if="!boat.rig" class="text-sm text-warning">{{ t('boats.maintenance.events.noRig') }}</p>
          <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">{{ errors.boatRigId }}</p>
        </template>

        <BaseInput
          id="maint-performed-at"
          name="performedAt"
          :label="t('boats.maintenance.events.performedAt')"
          type="date"
          required
          v-model="performedAt"
          :errors="errors"
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

        <div class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.events.parts') }}</p>
            <BaseButton variant="secondary" size="sm" type="button" @click="addPartRow">
              {{ t('boats.maintenance.events.addPart') }}
            </BaseButton>
          </div>
          <div v-if="partRows.length === 0" class="mt-3 text-sm text-fg-muted">{{ t('boats.maintenance.events.noParts') }}</div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="(p, idx) in partRows" :key="idx" class="grid gap-3 sm:grid-cols-6">
              <div class="sm:col-span-3">
                <BaseInput :id="`part-name-${idx}`" :name="`parts[${idx}][name]`" :label="t('boats.maintenance.events.partName')" v-model="p.name" />
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
                <BaseButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  :aria-label="t('boats.maintenance.events.removePart')"
                  @click="removePartRow(idx)"
                >
                  {{ t('boats.maintenance.events.removePart') }}
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <BaseButton type="submit" :disabled="processing || (subject === 'rig' && !boat.rig)">
          {{ t('boats.maintenance.events.createEntry') }}
        </BaseButton>
      </Form>
    </div>
  </BaseCard>
</template>

