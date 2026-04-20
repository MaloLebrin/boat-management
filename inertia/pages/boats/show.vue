<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'

type EngineRow = {
  id: number
  kind: string
  fuel: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  powerHp: number | null
  hours: number | null
}

type SailRow = {
  id: number
  sailType: string
  areaM2: number | null
  material: string | null
  reefPoints: number | null
}

type MaintenancePartRow = {
  name: string
  quantity: string
  notes: string
}

type MaintenanceEventRow = {
  id: number
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  parts: Array<{ id: number; name: string; quantity: number | null; notes: string | null }>
}

const props = defineProps<{
  boat: {
    id: number
    name: string
    registrationNumber: string | null
    type: string | null
    propulsionType: string | null
    lengthM: number | null
    beamM: number | null
    draftM: number | null
    mastHeightM: number | null
    hullMaterial: string | null
    yearBuilt: number | null
    manufacturer: string | null
    model: string | null
    engines: EngineRow[]
    sails: SailRow[]
    rig: {
      id: number
      rigType: string
      mastCount: number | null
      spreaders: number | null
    } | null
  }
  maintenanceEvents: MaintenanceEventRow[]
  canManageMaintenance: boolean
}>()

const subject = ref<'boat' | 'engine' | 'sail' | 'rig'>('boat')
const boatEngineId = ref<string>('')
const boatSailId = ref<string>('')
const engineCaptionManual = ref('')
const sailCaptionManual = ref('')
const partRows = ref<MaintenancePartRow[]>([])

watch(subject, () => {
  boatEngineId.value = ''
  boatSailId.value = ''
  engineCaptionManual.value = ''
  sailCaptionManual.value = ''
})

function addPartRow() {
  partRows.value.push({ name: '', quantity: '', notes: '' })
}

function removePartRow(index: number) {
  partRows.value.splice(index, 1)
}

const subjectLabel = (s: string) => {
  switch (s) {
    case 'boat':
      return 'Boat'
    case 'engine':
      return 'Engine'
    case 'sail':
      return 'Sail'
    case 'rig':
      return 'Rig'
    default:
      return s
  }
}

const targetDescription = (ev: MaintenanceEventRow) => {
  if (ev.subject === 'boat') return 'Whole boat'
  if (ev.subject === 'engine') return ev.engineCaption ?? 'Engine'
  if (ev.subject === 'sail') return ev.sailCaption ?? 'Sail'
  if (ev.subject === 'rig') return 'Rig'
  return '—'
}

const performedDisplay = (iso: string) => {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d || iso
}

const canSubmitRig = computed(() => props.boat.rig !== null)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-8 py-10">
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">{{ boat.name }}</h1>
        <p class="mt-2 text-base text-zinc-600">
          Registration: <span class="font-medium text-zinc-900">{{ boat.registrationNumber ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-zinc-600">
          Type: <span class="font-medium text-zinc-900">{{ boat.type ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-zinc-600">
          Propulsion: <span class="font-medium text-zinc-900">{{ boat.propulsionType ?? '—' }}</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a
          :href="`/boats/${boat.id}/edit`"
          class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
        >
          Edit
        </a>
        <a href="/boats" class="text-sm font-medium text-zinc-700 hover:underline">Back</a>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-6">
      <div class="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-zinc-900">Specs</h2>
        <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-zinc-600">Length</dt>
            <dd class="font-medium text-zinc-900">{{ boat.lengthM ?? '—' }}<template v-if="boat.lengthM !== null"> m</template></dd>
          </div>
          <div>
            <dt class="text-zinc-600">Beam</dt>
            <dd class="font-medium text-zinc-900">{{ boat.beamM ?? '—' }}<template v-if="boat.beamM !== null"> m</template></dd>
          </div>
          <div>
            <dt class="text-zinc-600">Draft</dt>
            <dd class="font-medium text-zinc-900">{{ boat.draftM ?? '—' }}<template v-if="boat.draftM !== null"> m</template></dd>
          </div>
          <div>
            <dt class="text-zinc-600">Mast height</dt>
            <dd class="font-medium text-zinc-900">{{ boat.mastHeightM ?? '—' }}<template v-if="boat.mastHeightM !== null"> m</template></dd>
          </div>
          <div>
            <dt class="text-zinc-600">Hull material</dt>
            <dd class="font-medium text-zinc-900">{{ boat.hullMaterial ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-600">Year built</dt>
            <dd class="font-medium text-zinc-900">{{ boat.yearBuilt ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-600">Manufacturer</dt>
            <dd class="font-medium text-zinc-900">{{ boat.manufacturer ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-600">Model</dt>
            <dd class="font-medium text-zinc-900">{{ boat.model ?? '—' }}</dd>
          </div>
        </dl>
      </div>

      <div class="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-zinc-900">Engines</h2>
        <div v-if="boat.engines.length === 0" class="mt-3 text-sm text-zinc-600">No engines.</div>
        <ul v-else class="mt-3 space-y-3 text-sm">
          <li v-for="e in boat.engines" :key="e.id" class="rounded-md border border-zinc-200 p-3">
            <p class="font-medium text-zinc-900">{{ e.kind }}<span v-if="e.fuel"> · {{ e.fuel }}</span></p>
            <p class="text-zinc-700">
              {{ e.brand ?? '—' }} {{ e.model ?? '' }}<span v-if="e.powerHp !== null"> · {{ e.powerHp }} hp</span
              ><span v-if="e.hours !== null"> · {{ e.hours }} h</span>
            </p>
          </li>
        </ul>
      </div>

      <div class="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-zinc-900">Sails</h2>
        <div v-if="boat.sails.length === 0" class="mt-3 text-sm text-zinc-600">No sails.</div>
        <ul v-else class="mt-3 space-y-3 text-sm">
          <li v-for="s in boat.sails" :key="s.id" class="rounded-md border border-zinc-200 p-3">
            <p class="font-medium text-zinc-900">{{ s.sailType }}</p>
            <p class="text-zinc-700">
              <span v-if="s.areaM2 !== null">{{ s.areaM2 }} m²</span><span v-if="s.material"> · {{ s.material }}</span
              ><span v-if="s.reefPoints !== null"> · reef {{ s.reefPoints }}</span>
            </p>
          </li>
        </ul>
      </div>

      <div v-if="boat.rig" class="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-zinc-900">Rig</h2>
        <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-zinc-600">Rig type</dt>
            <dd class="font-medium text-zinc-900">{{ boat.rig.rigType }}</dd>
          </div>
          <div>
            <dt class="text-zinc-600">Mast count</dt>
            <dd class="font-medium text-zinc-900">{{ boat.rig.mastCount ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-600">Spreaders</dt>
            <dd class="font-medium text-zinc-900">{{ boat.rig.spreaders ?? '—' }}</dd>
          </div>
        </dl>
      </div>

      <div class="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-zinc-900">Maintenance history</h2>
        <p class="mt-1 text-sm text-zinc-600">Work done on the hull, an engine, a sail, or the rig, with replaced parts.</p>

        <div v-if="maintenanceEvents.length === 0" class="mt-4 text-sm text-zinc-600">No entries yet.</div>
        <ul v-else class="mt-4 space-y-4">
          <li
            v-for="ev in maintenanceEvents"
            :key="ev.id"
            class="rounded-md border border-zinc-200 p-3 text-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-medium text-zinc-900">
                  {{ performedDisplay(ev.performedAt) }} — {{ ev.title }}
                </p>
                <p class="text-zinc-600">
                  {{ subjectLabel(ev.subject) }} · {{ targetDescription(ev) }}
                </p>
                <p v-if="ev.notes" class="mt-2 text-zinc-700">{{ ev.notes }}</p>
                <ul v-if="ev.parts.length" class="mt-2 list-inside list-disc text-zinc-700">
                  <li v-for="p in ev.parts" :key="p.id">
                    {{ p.name }}<template v-if="p.quantity !== null"> × {{ p.quantity }}</template>
                    <template v-if="p.notes"> — {{ p.notes }}</template>
                  </li>
                </ul>
              </div>
              <Form
                v-if="canManageMaintenance"
                :action="`/boats/${boat.id}/maintenance/${ev.id}`"
                method="delete"
                #default="{ processing }"
              >
                <button
                  type="submit"
                  :disabled="processing"
                  class="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </Form>
            </div>
          </li>
        </ul>

        <div v-if="canManageMaintenance" class="mt-6 border-t border-zinc-100 pt-6">
          <h3 class="text-sm font-medium text-zinc-900">Add entry</h3>
          <Form
            :action="`/boats/${boat.id}/maintenance`"
            method="post"
            class="mt-4 space-y-4"
            #default="{ processing, errors }"
          >
            <div>
              <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-subject">Subject</label>
              <select
                id="maint-subject"
                v-model="subject"
                name="subject"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="boat">Whole boat</option>
                <option value="engine">Engine</option>
                <option value="sail">Sail</option>
                <option value="rig" :disabled="!canSubmitRig">Rig</option>
              </select>
              <p v-if="errors.subject" class="mt-1 text-sm text-red-600">{{ errors.subject }}</p>
            </div>

            <template v-if="subject === 'engine'">
              <div v-if="boat.engines.length">
                <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-engine">Engine</label>
                <select
                  id="maint-engine"
                  v-model="boatEngineId"
                  name="boatEngineId"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="">— Select —</option>
                  <option v-for="e in boat.engines" :key="e.id" :value="String(e.id)">
                    {{ e.kind }} · {{ e.brand ?? '' }} {{ e.model ?? '' }}
                  </option>
                </select>
                <p v-if="errors.boatEngineId" class="mt-1 text-sm text-red-600">{{ errors.boatEngineId }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-engine-caption">
                  Label <span v-if="!boat.engines.length" class="text-red-600">*</span>
                  <span v-else class="font-normal text-zinc-500">(if not selecting an engine)</span>
                </label>
                <input
                  id="maint-engine-caption"
                  v-model="engineCaptionManual"
                  type="text"
                  name="engineCaption"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g. Inboard diesel port"
                />
                <p v-if="errors.engineCaption" class="mt-1 text-sm text-red-600">{{ errors.engineCaption }}</p>
              </div>
            </template>

            <template v-if="subject === 'sail'">
              <div v-if="boat.sails.length">
                <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-sail">Sail</label>
                <select
                  id="maint-sail"
                  v-model="boatSailId"
                  name="boatSailId"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="">— Select —</option>
                  <option v-for="s in boat.sails" :key="s.id" :value="String(s.id)">
                    {{ s.sailType }}<span v-if="s.areaM2 !== null"> · {{ s.areaM2 }} m²</span>
                  </option>
                </select>
                <p v-if="errors.boatSailId" class="mt-1 text-sm text-red-600">{{ errors.boatSailId }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-sail-caption">
                  Label <span v-if="!boat.sails.length" class="text-red-600">*</span>
                  <span v-else class="font-normal text-zinc-500">(if not selecting a sail)</span>
                </label>
                <input
                  id="maint-sail-caption"
                  v-model="sailCaptionManual"
                  type="text"
                  name="sailCaption"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g. Main — 3 reefs"
                />
                <p v-if="errors.sailCaption" class="mt-1 text-sm text-red-600">{{ errors.sailCaption }}</p>
              </div>
            </template>

            <template v-if="subject === 'rig'">
              <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
              <p v-if="!boat.rig" class="text-sm text-amber-800">Save a rig on this boat before logging rig maintenance.</p>
              <p v-if="errors.boatRigId" class="mt-1 text-sm text-red-600">{{ errors.boatRigId }}</p>
            </template>

            <div>
              <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-date">Date</label>
              <input
                id="maint-date"
                type="date"
                name="performedAt"
                required
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <p v-if="errors.performedAt" class="mt-1 text-sm text-red-600">{{ errors.performedAt }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-title">Title</label>
              <input
                id="maint-title"
                type="text"
                name="title"
                required
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="e.g. Oil change, batten replacement"
              />
              <p v-if="errors.title" class="mt-1 text-sm text-red-600">{{ errors.title }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-zinc-800" for="maint-notes">Notes</label>
              <textarea
                id="maint-notes"
                name="notes"
                rows="3"
                class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <p v-if="errors.notes" class="mt-1 text-sm text-red-600">{{ errors.notes }}</p>
            </div>

            <div>
              <div class="flex items-center justify-between gap-2">
                <label class="text-sm font-medium text-zinc-800">Parts replaced (optional)</label>
                <button
                  type="button"
                  class="text-xs font-medium text-zinc-700 hover:underline"
                  @click="addPartRow"
                >
                  + Add part
                </button>
              </div>
              <div v-for="(row, i) in partRows" :key="i" class="mt-3 grid grid-cols-1 gap-2 rounded-md border border-zinc-100 p-3 sm:grid-cols-12">
                <div class="sm:col-span-5">
                  <input
                    v-model="row.name"
                    type="text"
                    :name="`parts[${i}][name]`"
                    placeholder="Part name"
                    class="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm"
                  />
                </div>
                <div class="sm:col-span-2">
                  <input
                    v-model="row.quantity"
                    type="number"
                    min="1"
                    step="1"
                    :name="`parts[${i}][quantity]`"
                    placeholder="Qty"
                    class="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm"
                  />
                </div>
                <div class="sm:col-span-4">
                  <input
                    v-model="row.notes"
                    type="text"
                    :name="`parts[${i}][notes]`"
                    placeholder="Notes"
                    class="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm"
                  />
                </div>
                <div class="flex items-center sm:col-span-1">
                  <button type="button" class="text-xs text-red-700 hover:underline" @click="removePartRow(i)">Remove</button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="processing || (subject === 'rig' && !boat.rig)"
              class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save entry
            </button>
          </Form>
        </div>
      </div>
    </div>
  </div>
</template>
