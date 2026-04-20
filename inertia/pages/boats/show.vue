<script setup lang="ts">
defineProps<{
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
    engines: Array<{
      id: number
      kind: string
      fuel: string | null
      brand: string | null
      model: string | null
      serialNumber: string | null
      powerKw: number | null
      hours: number | null
    }>
    sails: Array<{
      id: number
      sailType: string
      areaM2: number | null
      material: string | null
      reefPoints: number | null
    }>
    rig: {
      id: number
      rigType: string
      mastCount: number | null
      spreaders: number | null
    } | null
  }
}>()
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
              {{ e.brand ?? '—' }} {{ e.model ?? '' }}<span v-if="e.powerKw !== null"> · {{ e.powerKw }} kW</span><span v-if="e.hours !== null"> · {{ e.hours }} h</span>
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
              <span v-if="s.areaM2 !== null">{{ s.areaM2 }} m²</span><span v-if="s.material"> · {{ s.material }}</span><span v-if="s.reefPoints !== null"> · reef {{ s.reefPoints }}</span>
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
    </div>
  </div>
</template>

