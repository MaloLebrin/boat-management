<script setup lang="ts">
defineProps<{
  boats: Array<{
    id: number
    name: string
    registrationNumber: string | null
    type: string | null
    propulsionType: string | null
  }>
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-8 py-10">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Boats</h1>
        <p class="mt-2 text-base text-zinc-600">All boats in your organization</p>
      </div>
      <a
        href="/boats/new"
        class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
      >
        New boat
      </a>
    </div>

    <div class="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-zinc-50 text-zinc-700">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Registration</th>
            <th class="px-4 py-3 font-medium">Type</th>
            <th class="px-4 py-3 font-medium">Propulsion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="boat in boats" :key="boat.id" class="border-t border-zinc-200">
            <td class="px-4 py-3">
              <a :href="`/boats/${boat.id}`" class="font-medium text-zinc-900 hover:underline">
                {{ boat.name }}
              </a>
            </td>
            <td class="px-4 py-3 text-zinc-700">{{ boat.registrationNumber ?? '—' }}</td>
            <td class="px-4 py-3 text-zinc-700">{{ boat.type ?? '—' }}</td>
            <td class="px-4 py-3 text-zinc-700">{{ boat.propulsionType ?? '—' }}</td>
          </tr>
          <tr v-if="boats.length === 0">
            <td class="px-4 py-8 text-center text-zinc-600" colspan="4">
              No boats yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

