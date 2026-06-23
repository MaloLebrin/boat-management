<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  log: NavigationLogRow
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const SEA_STATES = ['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('navigation_logs.form.updateTitle') }}</h3>

    <Form
      :action="{ url: `/boats/${boatId}/navigation-logs/${log.id}`, method: 'patch' }"
      #default="{ processing, errors }"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Wind force -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.windForceBeaufort') }}
          </label>
          <input
            type="number"
            name="windForceBeaufort"
            step="1"
            min="0"
            max="12"
            :value="log.windForceBeaufort ?? ''"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.windForceBeaufort" class="mt-1 text-xs text-danger">
            {{ errors.windForceBeaufort }}
          </p>
        </div>

        <!-- Sea state -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.seaState') }}
          </label>
          <select
            name="seaState"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('navigation_logs.fields.selectSeaState') }}</option>
            <option
              v-for="state in SEA_STATES"
              :key="state"
              :value="state"
              :selected="log.seaState === state"
            >
              {{ t(`navigation_logs.seaState.${state}`) }}
            </option>
          </select>
        </div>

        <!-- Crew count -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.crewCount') }}
          </label>
          <input
            type="number"
            name="crewCount"
            step="1"
            min="0"
            :value="log.crewCount ?? ''"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.crewCount" class="mt-1 text-xs text-danger">{{ errors.crewCount }}</p>
        </div>

        <!-- Notes -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.notes') }}
          </label>
          <textarea
            name="notes"
            rows="3"
            maxlength="5000"
            :value="log.notes ?? ''"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <p v-if="errors.notes" class="mt-1 text-xs text-danger">{{ errors.notes }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('navigation_logs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('navigation_logs.form.submitUpdate') }}
        </BaseButton>
      </div>
    </Form>
  </div>
</template>
