<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'

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
  <div class="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between">
      <div>
        <BaseHeading level="1">Boats</BaseHeading>
        <p class="mt-2 text-base text-fg-muted">All boats in your organization</p>
      </div>
      <a href="/boats/new">
        <BaseButton variant="primary">New boat</BaseButton>
      </a>
    </div>

    <div class="mt-8 overflow-hidden rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-muted text-fg-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Registration</th>
            <th class="px-4 py-3 font-semibold">Type</th>
            <th class="px-4 py-3 font-semibold">Propulsion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="boat in boats" :key="boat.id" class="border-t border-border">
            <td class="px-4 py-3">
              <a :href="`/boats/${boat.id}`" class="font-semibold text-fg hover:underline">
                {{ boat.name }}
              </a>
            </td>
            <td class="px-4 py-3 text-fg-muted">{{ boat.registrationNumber ?? '—' }}</td>
            <td class="px-4 py-3 text-fg-muted">{{ boat.type ?? '—' }}</td>
            <td class="px-4 py-3 text-fg-muted">{{ boat.propulsionType ?? '—' }}</td>
          </tr>
          <tr v-if="boats.length === 0">
            <td class="px-4 py-10 text-center text-fg-muted" colspan="4">
              No boats yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

