<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'

type EngineForm = {
  kind: 'inboard' | 'outboard' | 'electric' | 'hybrid' | 'other'
  fuel: 'diesel' | 'essence' | 'electric' | 'other' | ''
  brand: string
  model: string
  serialNumber: string
  powerHp: string
  hours: string
}

type SailForm = {
  sailType: 'main' | 'genoa' | 'jib' | 'spinnaker' | 'gennaker' | 'storm_jib' | 'other'
  areaM2: string
  material: string
  reefPoints: string
}

type RigForm = {
  rigType: 'sloop' | 'cutter' | 'ketch' | 'yawl' | 'schooner' | 'cat_rig' | 'other'
  mastCount: string
  spreaders: string
}

const props = defineProps<{
  boat: {
    id: number
    name: string
    registrationNumber: string | null
    type: string | null
    manufacturedAt: string | null
    propulsionType: string | null
    lengthM: number | null
    beamM: number | null
    draftM: number | null
    mastHeightM: number | null
    hullMaterial: string | null
    yearBuilt: number | null
    manufacturer: string | null
    model: string | null
    engines: Array<{
      id: number
      kind: string
      fuel: string | null
      brand: string | null
      model: string | null
      serialNumber: string | null
      manufacturedAt: string | null
      powerHp: number | null
      hours: number | null
    }>
    sails: Array<{
      id: number
      sailType: string
      manufacturedAt: string | null
      areaM2: number | null
      material: string | null
      reefPoints: number | null
    }>
    rig: {
      id: number
      rigType: string
      manufacturedAt: string | null
      mastCount: number | null
      spreaders: number | null
    } | null
  }
}>()

const propulsionType = ref<
  'sailboat' | 'motorboat' | 'catamaran' | 'rib' | 'other' | ''
>((props.boat.propulsionType as any) ?? '')

const engines = ref<EngineForm[]>(
  props.boat.engines.length
    ? props.boat.engines.map((e) => ({
        kind: (e.kind as any) ?? 'inboard',
        fuel: (e.fuel as any) ?? '',
        brand: e.brand ?? '',
        model: e.model ?? '',
        serialNumber: e.serialNumber ?? '',
        powerHp: e.powerHp === null ? '' : String(e.powerHp),
        hours: e.hours === null ? '' : String(e.hours),
      }))
    : [
        {
          kind: 'inboard',
          fuel: 'diesel',
          brand: '',
          model: '',
          serialNumber: '',
          powerHp: '',
          hours: '',
        },
      ]
)

const sails = ref<SailForm[]>(
  props.boat.sails.map((s) => ({
    sailType: (s.sailType as any) ?? 'main',
    areaM2: s.areaM2 === null ? '' : String(s.areaM2),
    material: s.material ?? '',
    reefPoints: s.reefPoints === null ? '' : String(s.reefPoints),
  }))
)

const rig = ref<RigForm>({
  rigType: ((props.boat.rig?.rigType as any) ?? 'sloop') as any,
  mastCount: props.boat.rig?.mastCount === null || props.boat.rig?.mastCount === undefined ? '' : String(props.boat.rig.mastCount),
  spreaders: props.boat.rig?.spreaders === null || props.boat.rig?.spreaders === undefined ? '' : String(props.boat.rig.spreaders),
})

const showSailFields = computed(() => propulsionType.value === 'sailboat')

function addEngine() {
  engines.value.push({
    kind: 'inboard',
    fuel: 'diesel',
    brand: '',
    model: '',
    serialNumber: '',
    powerHp: '',
    hours: '',
  })
}

function removeEngine(index: number) {
  engines.value.splice(index, 1)
}

function addSail() {
  sails.value.push({ sailType: 'main', areaM2: '', material: '', reefPoints: '' })
}

function removeSail(index: number) {
  sails.value.splice(index, 1)
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-8 py-10">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Edit boat</h1>
      <p class="mt-2 text-base text-zinc-600">Update boat details</p>
    </div>

    <div class="mt-8">
      <Form :action="`/boats/${boat.id}`" method="put" #default="{ processing, errors }">
        <div class="space-y-6">
          <div>
            <label for="name" class="mb-1 block text-sm font-medium text-zinc-800">Name</label>
            <input
              type="text"
              name="name"
              id="name"
              :value="boat.name"
              :data-invalid="errors.name ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.name" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.name }}
            </p>
          </div>

          <div>
            <label for="registrationNumber" class="mb-1 block text-sm font-medium text-zinc-800">
              Registration number
            </label>
            <input
              type="text"
              name="registrationNumber"
              id="registrationNumber"
              :value="boat.registrationNumber ?? ''"
              :data-invalid="errors.registrationNumber ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.registrationNumber" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.registrationNumber }}
            </p>
          </div>

          <div>
            <label for="type" class="mb-1 block text-sm font-medium text-zinc-800">Type</label>
            <input
              type="text"
              name="type"
              id="type"
              :value="boat.type ?? ''"
              :data-invalid="errors.type ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.type" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.type }}
            </p>
          </div>

          <div>
            <label for="propulsionType" class="mb-1 block text-sm font-medium text-zinc-800">
              Propulsion type
            </label>
            <select
              id="propulsionType"
              name="propulsionType"
              v-model="propulsionType"
              :data-invalid="errors.propulsionType ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            >
              <option value="">—</option>
              <option value="sailboat">Sailboat</option>
              <option value="motorboat">Motorboat</option>
              <option value="catamaran">Catamaran</option>
              <option value="rib">RIB</option>
              <option value="other">Other</option>
            </select>
            <p v-if="errors.propulsionType" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.propulsionType }}
            </p>
          </div>

          <div>
            <label for="manufacturedAt" class="mb-1 block text-sm font-medium text-zinc-800">
              Manufacturing date
            </label>
            <input
              type="date"
              name="manufacturedAt"
              id="manufacturedAt"
              :value="boat.manufacturedAt ?? ''"
              :data-invalid="errors.manufacturedAt ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.manufacturedAt" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.manufacturedAt }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="lengthM" class="mb-1 block text-sm font-medium text-zinc-800">Length (m)</label>
              <input
                type="number"
                step="0.01"
                name="lengthM"
                id="lengthM"
                :value="boat.lengthM ?? ''"
                :data-invalid="errors.lengthM ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.lengthM" class="mt-2 text-sm font-medium text-red-600">{{ errors.lengthM }}</p>
            </div>
            <div>
              <label for="beamM" class="mb-1 block text-sm font-medium text-zinc-800">Beam (m)</label>
              <input
                type="number"
                step="0.01"
                name="beamM"
                id="beamM"
                :value="boat.beamM ?? ''"
                :data-invalid="errors.beamM ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.beamM" class="mt-2 text-sm font-medium text-red-600">{{ errors.beamM }}</p>
            </div>
            <div>
              <label for="draftM" class="mb-1 block text-sm font-medium text-zinc-800">Draft (m)</label>
              <input
                type="number"
                step="0.01"
                name="draftM"
                id="draftM"
                :value="boat.draftM ?? ''"
                :data-invalid="errors.draftM ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.draftM" class="mt-2 text-sm font-medium text-red-600">{{ errors.draftM }}</p>
            </div>
            <div v-if="showSailFields">
              <label for="mastHeightM" class="mb-1 block text-sm font-medium text-zinc-800">
                Mast height (m)
              </label>
              <input
                type="number"
                step="0.01"
                name="mastHeightM"
                id="mastHeightM"
                :value="boat.mastHeightM ?? ''"
                :data-invalid="errors.mastHeightM ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.mastHeightM" class="mt-2 text-sm font-medium text-red-600">
                {{ errors.mastHeightM }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="hullMaterial" class="mb-1 block text-sm font-medium text-zinc-800">Hull material</label>
              <select
                id="hullMaterial"
                name="hullMaterial"
                :value="boat.hullMaterial ?? ''"
                :data-invalid="errors.hullMaterial ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              >
                <option value="">—</option>
                <option value="fiberglass">Fiberglass</option>
                <option value="aluminum">Aluminum</option>
                <option value="steel">Steel</option>
                <option value="wood">Wood</option>
                <option value="carbon">Carbon</option>
                <option value="other">Other</option>
              </select>
              <p v-if="errors.hullMaterial" class="mt-2 text-sm font-medium text-red-600">
                {{ errors.hullMaterial }}
              </p>
            </div>
            <div>
              <label for="yearBuilt" class="mb-1 block text-sm font-medium text-zinc-800">Year built</label>
              <input
                type="number"
                name="yearBuilt"
                id="yearBuilt"
                :value="boat.yearBuilt ?? ''"
                :data-invalid="errors.yearBuilt ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.yearBuilt" class="mt-2 text-sm font-medium text-red-600">{{ errors.yearBuilt }}</p>
            </div>
            <div>
              <label for="manufacturer" class="mb-1 block text-sm font-medium text-zinc-800">Manufacturer</label>
              <input
                type="text"
                name="manufacturer"
                id="manufacturer"
                :value="boat.manufacturer ?? ''"
                :data-invalid="errors.manufacturer ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.manufacturer" class="mt-2 text-sm font-medium text-red-600">
                {{ errors.manufacturer }}
              </p>
            </div>
            <div>
              <label for="model" class="mb-1 block text-sm font-medium text-zinc-800">Model</label>
              <input
                type="text"
                name="model"
                id="model"
                :value="boat.model ?? ''"
                :data-invalid="errors.model ? 'true' : undefined"
                class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
              />
              <p v-if="errors.model" class="mt-2 text-sm font-medium text-red-600">{{ errors.model }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-zinc-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-zinc-900">Engines</h2>
              <button type="button" class="text-sm font-medium text-zinc-700 hover:underline" @click="addEngine">
                Add engine
              </button>
            </div>

            <div class="mt-4 space-y-6">
              <div v-for="(engine, index) in engines" :key="index" class="rounded-md border border-zinc-200 p-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-zinc-900">Engine {{ index + 1 }}</p>
                  <button
                    v-if="engines.length > 1"
                    type="button"
                    class="text-sm font-medium text-red-700 hover:underline"
                    @click="removeEngine(index)"
                  >
                    Remove
                  </button>
                </div>

                <div class="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Kind</label>
                    <select
                      v-model="engine.kind"
                      :name="`engines[${index}][kind]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="inboard">Inboard</option>
                      <option value="outboard">Outboard</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Fuel</label>
                    <select
                      v-model="engine.fuel"
                      :name="`engines[${index}][fuel]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="">—</option>
                      <option value="diesel">Diesel</option>
                      <option value="essence">Essence</option>
                      <option value="electric">Electric</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Brand</label>
                    <input
                      v-model="engine.brand"
                      :name="`engines[${index}][brand]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Model</label>
                    <input
                      v-model="engine.model"
                      :name="`engines[${index}][model]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Serial number</label>
                    <input
                      v-model="engine.serialNumber"
                      :name="`engines[${index}][serialNumber]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
                    <input
                      type="date"
                      :name="`engines[${index}][manufacturedAt]`"
                      :value="boat.engines[index]?.manufacturedAt ?? ''"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Power (hp)</label>
                    <input
                      v-model="engine.powerHp"
                      type="number"
                      step="0.1"
                      :name="`engines[${index}][powerHp]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Hours</label>
                    <input
                      v-model="engine.hours"
                      type="number"
                      :name="`engines[${index}][hours]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="showSailFields" class="rounded-lg border border-zinc-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-zinc-900">Sails</h2>
              <button type="button" class="text-sm font-medium text-zinc-700 hover:underline" @click="addSail">
                Add sail
              </button>
            </div>

            <div class="mt-4 space-y-6">
              <div v-if="sails.length === 0" class="text-sm text-zinc-600">No sails.</div>
              <div v-for="(sail, index) in sails" :key="index" class="rounded-md border border-zinc-200 p-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-zinc-900">Sail {{ index + 1 }}</p>
                  <button type="button" class="text-sm font-medium text-red-700 hover:underline" @click="removeSail(index)">
                    Remove
                  </button>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Type</label>
                    <select
                      v-model="sail.sailType"
                      :name="`sails[${index}][sailType]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="main">Main</option>
                      <option value="genoa">Genoa</option>
                      <option value="jib">Jib</option>
                      <option value="spinnaker">Spinnaker</option>
                      <option value="gennaker">Gennaker</option>
                      <option value="storm_jib">Storm jib</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
                    <input
                      type="date"
                      :name="`sails[${index}][manufacturedAt]`"
                      :value="boat.sails[index]?.manufacturedAt ?? ''"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Area (m²)</label>
                    <input
                      v-model="sail.areaM2"
                      type="number"
                      step="0.1"
                      :name="`sails[${index}][areaM2]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Material</label>
                    <input
                      v-model="sail.material"
                      :name="`sails[${index}][material]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-zinc-800">Reef points</label>
                    <input
                      v-model="sail.reefPoints"
                      type="number"
                      :name="`sails[${index}][reefPoints]`"
                      class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="showSailFields" class="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 class="text-sm font-semibold text-zinc-900">Rig</h2>
            <div class="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800">Rig type</label>
                <select
                  v-model="rig.rigType"
                  name="rig[rigType]"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="sloop">Sloop</option>
                  <option value="cutter">Cutter</option>
                  <option value="ketch">Ketch</option>
                  <option value="yawl">Yawl</option>
                  <option value="schooner">Schooner</option>
                  <option value="cat_rig">Cat rig</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
                <input
                  type="date"
                  name="rig[manufacturedAt]"
                  :value="boat.rig?.manufacturedAt ?? ''"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800">Mast count</label>
                <input
                  v-model="rig.mastCount"
                  type="number"
                  name="rig[mastCount]"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-zinc-800">Spreaders</label>
                <input
                  v-model="rig.spreaders"
                  type="number"
                  name="rig[spreaders]"
                  class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                type="submit"
                :disabled="processing"
                class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
              <a :href="`/boats/${boat.id}`" class="text-sm font-medium text-zinc-700 hover:underline">
                Cancel
              </a>
            </div>

            <Form :action="`/boats/${boat.id}`" method="delete" #default="{ processing: deleting }">
              <button
                type="submit"
                :disabled="deleting"
                class="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </Form>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>

