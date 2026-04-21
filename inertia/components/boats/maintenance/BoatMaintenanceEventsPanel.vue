<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatShowDetail, MaintenanceEventRow } from '~/types/boat_show'
import { performedDisplay, subjectLabel, targetDescription } from './utils'

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

const subjectOptions: ReadonlyArray<{ label: string; value: Subject }> = [
  { label: 'Whole boat', value: 'boat' },
  { label: 'Engine', value: 'engine' },
  { label: 'Sail', value: 'sail' },
  { label: 'Rig', value: 'rig' },
]

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
        <p class="text-sm font-semibold text-fg">Maintenance history</p>
        <p class="text-sm text-fg-muted">Work done on the hull, an engine, a sail, or the rig.</p>
      </div>
    </template>

    <div v-if="events.length === 0" class="text-sm text-fg-muted">No entries yet.</div>
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
              Remove
            </BaseButton>
          </Form>
        </div>
      </li>
    </ul>

    <div v-if="canManageMaintenance" id="maintenance-add-entry" class="mt-6 border-t border-border pt-6">
      <p class="text-sm font-semibold text-fg">Add entry</p>
      <Form
        :action="{ url: `/boats/${boat.id}/maintenance`, method: 'post' }"
        class="mt-4 space-y-4"
        #default="{ processing, errors }"
      >
        <BaseSelect
          id="maint-subject"
          name="subject"
          label="Subject"
          :options="subjectOptions"
          v-model="subject"
          :errors="errors"
        />

        <template v-if="subject === 'engine'">
          <BaseSelect
            v-if="engineOptions.length"
            id="maint-engine"
            name="boatEngineId"
            label="Engine"
            placeholder="— Select —"
            :allow-empty="true"
            :options="engineOptions"
            v-model="boatEngineId"
            :errors="errors"
          />
          <BaseInput
            id="maint-engine-caption"
            name="engineCaption"
            label="Label"
            placeholder="e.g. Inboard diesel port"
            v-model="engineCaptionManual"
            :errors="errors"
          />
        </template>

        <template v-if="subject === 'sail'">
          <BaseSelect
            v-if="sailOptions.length"
            id="maint-sail"
            name="boatSailId"
            label="Sail"
            placeholder="— Select —"
            :allow-empty="true"
            :options="sailOptions"
            v-model="boatSailId"
            :errors="errors"
          />
          <BaseInput
            id="maint-sail-caption"
            name="sailCaption"
            label="Label"
            placeholder="e.g. Genoa #2"
            v-model="sailCaptionManual"
            :errors="errors"
          />
        </template>

        <template v-if="subject === 'rig'">
          <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
          <p v-if="!boat.rig" class="text-sm text-warning">Save a rig on this boat before adding rig entries.</p>
          <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">{{ errors.boatRigId }}</p>
        </template>

        <BaseInput
          id="maint-performed-at"
          name="performedAt"
          label="Performed at"
          type="date"
          required
          v-model="performedAt"
          :errors="errors"
        />

        <BaseInput
          id="maint-title"
          name="title"
          label="Title"
          required
          placeholder="e.g. Changed oil filter"
          v-model="entryTitle"
          :errors="errors"
        />

        <BaseTextarea
          id="maint-notes"
          name="notes"
          label="Notes"
          :rows="3"
          v-model="entryNotes"
          :errors="errors"
        />

        <div class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-fg">Parts</p>
            <BaseButton variant="secondary" size="sm" type="button" @click="addPartRow">
              Add part
            </BaseButton>
          </div>
          <div v-if="partRows.length === 0" class="mt-3 text-sm text-fg-muted">No parts.</div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="(p, idx) in partRows" :key="idx" class="grid gap-3 sm:grid-cols-6">
              <div class="sm:col-span-3">
                <BaseInput :id="`part-name-${idx}`" :name="`parts[${idx}][name]`" label="Name" v-model="p.name" />
              </div>
              <div class="sm:col-span-1">
                <BaseInput
                  :id="`part-qty-${idx}`"
                  :name="`parts[${idx}][quantity]`"
                  label="Qty"
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
                  label="Notes"
                  v-model="p.notes"
                />
              </div>
              <div class="sm:col-span-6 flex justify-end">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  :aria-label="`Remove part row ${idx + 1}`"
                  @click="removePartRow(idx)"
                >
                  Remove
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <BaseButton type="submit" :disabled="processing || (subject === 'rig' && !boat.rig)">
          Create entry
        </BaseButton>
      </Form>
    </div>
  </BaseCard>
</template>

