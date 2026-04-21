<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatFormHullFields from '~/components/boats/hull/BoatFormHullFields.vue'
import type { BoatEditPayload, PropulsionTypeUi } from '~/types/boat_form'
import { parsePropulsionType } from '~/types/boat_form'
import { computed, ref } from 'vue'

const props = defineProps<{
  boat: BoatEditPayload
}>()

const propulsionType = ref<PropulsionTypeUi>(parsePropulsionType(props.boat.propulsionType))
const showSailFields = computed(() => propulsionType.value === 'sailboat')
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-8 py-10">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Edit boat</h1>
      <p class="mt-2 text-base text-zinc-600">Update boat details</p>
    </div>

    <div class="mt-8">
      <Form :action="{ url: `/boats/${boat.id}`, method: 'put' }" #default="{ processing, errors }">
        <div class="space-y-6">
          <BoatFormHullFields
            v-model:propulsion-type="propulsionType"
            mode="edit"
            :boat="boat"
            :show-mast-height="showSailFields"
            :errors="errors"
          />

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
        </div>
      </Form>

      <Form
        :action="{ url: `/boats/${boat.id}`, method: 'delete' }"
        class="mt-6 flex justify-end"
        #default="{ processing: deleting }"
      >
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
</template>
