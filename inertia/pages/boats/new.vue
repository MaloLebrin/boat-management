<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatFormEnginesEditor from '~/components/boats/BoatFormEnginesEditor.vue'
import BoatFormHullFields from '~/components/boats/BoatFormHullFields.vue'
import BoatFormRigEditor from '~/components/boats/BoatFormRigEditor.vue'
import BoatFormSailsEditor from '~/components/boats/BoatFormSailsEditor.vue'
import { useBoatForm } from '~/composables/use_boat_form'

const { propulsionType, engines, sails, rig, showSailFields, addEngine, removeEngine, addSail, removeSail } =
  useBoatForm()
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-8 py-10">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">New boat</h1>
      <p class="mt-2 text-base text-zinc-600">Create a new boat in your organization</p>
    </div>

    <div class="mt-8">
      <Form method="post" action="/boats" #default="{ processing, errors }">
        <div class="space-y-6">
          <BoatFormHullFields
            v-model:propulsion-type="propulsionType"
            mode="create"
            :show-mast-height="showSailFields"
            :errors="errors"
          />

          <BoatFormEnginesEditor
            v-model:engines="engines"
            @add="addEngine"
            @remove="removeEngine"
          />

          <BoatFormSailsEditor
            v-if="showSailFields"
            v-model:sails="sails"
            @add="addSail"
            @remove="removeSail"
          />

          <BoatFormRigEditor v-if="showSailFields" v-model:rig="rig" />

          <div class="flex items-center gap-3">
            <button
              type="submit"
              :disabled="processing"
              class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create
            </button>
            <a href="/boats" class="text-sm font-medium text-zinc-700 hover:underline">Cancel</a>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
