<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatFormEnginesEditor from '~/components/boats/BoatFormEnginesEditor.vue'
import BoatFormHullFields from '~/components/boats/BoatFormHullFields.vue'
import BoatFormRigEditor from '~/components/boats/BoatFormRigEditor.vue'
import BoatFormSailsEditor from '~/components/boats/BoatFormSailsEditor.vue'
import { useBoatForm } from '~/composables/use_boat_form'
import type { BoatEditPayload } from '~/types/boat_form'

const props = defineProps<{
  boat: BoatEditPayload
}>()

const {
  propulsionType,
  engines,
  sails,
  rig,
  showSailFields,
  initFromBoat,
  addEngine,
  removeEngine,
  addSail,
  removeSail,
} = useBoatForm()

initFromBoat(props.boat)
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
          <BoatFormHullFields
            v-model:propulsion-type="propulsionType"
            mode="edit"
            :boat="boat"
            :show-mast-height="showSailFields"
            :errors="errors"
          />

          <BoatFormEnginesEditor
            v-model:engines="engines"
            :boat="boat"
            @add="addEngine"
            @remove="removeEngine"
          />

          <BoatFormSailsEditor
            v-if="showSailFields"
            v-model:sails="sails"
            :boat="boat"
            @add="addSail"
            @remove="removeSail"
          />

          <BoatFormRigEditor v-if="showSailFields" v-model:rig="rig" :boat="boat" />

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

      <Form :action="`/boats/${boat.id}`" method="delete" class="mt-6 flex justify-end" #default="{ processing: deleting }">
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
