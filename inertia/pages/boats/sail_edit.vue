<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentSailFields from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import type { BoatEquipmentSailFieldsModel } from '~/components/boats/sail/BoatEquipmentSailFields.vue'

defineProps<{
  boat: { id: number; name: string }
  sail: BoatEquipmentSailFieldsModel & { id: number }
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-8 py-10">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Edit sail</h1>
      <p class="mt-2 text-base text-zinc-600">{{ boat.name }}</p>
    </div>

    <div class="mt-8">
      <Form
        :action="{ url: `/boats/${boat.id}/sails/${sail.id}`, method: 'put' }"
        #default="{ processing, errors }"
      >
        <div class="space-y-6 rounded-lg border border-zinc-200 bg-white p-4">
          <BoatEquipmentSailFields :errors="errors" :sail="sail" />
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
