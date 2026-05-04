<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatFormHullFields from '~/components/boats/hull/BoatFormHullFields.vue'
import type { BoatEditPayload, PropulsionTypeUi } from '~/types/boat_form'
import { parsePropulsionType } from '~/types/boat_form'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

const props = defineProps<{
  boat: BoatEditPayload
}>()

const propulsionType = ref<PropulsionTypeUi>(parsePropulsionType(props.boat.propulsionType))
const showSailFields = computed(() => propulsionType.value === 'sailboat')
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('boats.edit.title') }}</BaseHeading>
      <p class="text-base text-fg-muted">{{ t('boats.edit.subtitle') }}</p>
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
            <BaseButton type="submit" :disabled="processing">{{ t('boats.edit.submit') }}</BaseButton>
            <a :href="`/boats/${boat.id}`" class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline">
              {{ t('boats.edit.cancel') }}
            </a>
          </div>
        </div>
      </Form>

      <Form
        :action="{ url: `/boats/${boat.id}`, method: 'delete' }"
        class="mt-6 flex justify-end"
        #default="{ processing: deleting }"
      >
        <BaseButton type="submit" variant="danger" size="sm" :disabled="deleting">
          {{ t('common.delete') }}
        </BaseButton>
      </Form>
    </div>
  </div>
</template>
