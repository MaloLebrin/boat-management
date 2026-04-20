<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentRigFields from '~/components/boats/rig/BoatEquipmentRigFields.vue'
import type { BoatEquipmentRigFieldsModel } from '~/components/boats/rig/BoatEquipmentRigFields.vue'

defineProps<{
  boat: { id: number; name: string }
  rig: (BoatEquipmentRigFieldsModel & { id: number }) | null
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-8 py-10">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">
        {{ rig ? 'Edit rig' : 'Add rig' }}
      </h1>
      <p class="mt-2 text-base text-zinc-600">{{ boat.name }}</p>
    </div>

    <div class="mt-8">
      <Form :action="`/boats/${boat.id}/rig`" method="put" #default="{ processing, errors }">
        <div class="space-y-6 rounded-lg border border-zinc-200 bg-white p-4">
          <BoatEquipmentRigFields :errors="errors" :rig="rig" />
          <div class="flex items-center gap-3">
            <button
              type="submit"
              :disabled="processing"
              class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <a :href="`/boats/${boat.id}`" class="text-sm font-medium text-zinc-700 hover:underline">Cancel</a>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
