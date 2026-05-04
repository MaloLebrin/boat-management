<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatFormHullFields from '~/components/boats/hull/BoatFormHullFields.vue'
import { computed, ref } from 'vue'
import type { PropulsionTypeUi } from '~/types/boat_form'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
const propulsionType = ref<PropulsionTypeUi>('')
const showSailFields = computed(() => propulsionType.value === 'sailboat')
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('boats.new.title') }}</BaseHeading>
      <p class="text-base text-fg-muted">{{ t('boats.new.subtitle') }}</p>
    </div>

    <div class="mt-8">
      <Form :action="{ url: '/boats', method: 'post' }" #default="{ processing, errors }">
        <div class="space-y-6">
          <BoatFormHullFields
            v-model:propulsion-type="propulsionType"
            mode="create"
            :show-mast-height="showSailFields"
            :errors="errors"
          />

          <div class="flex items-center gap-3">
            <BaseButton type="submit" :disabled="processing">{{ t('boats.new.submit') }}</BaseButton>
            <a href="/boats" class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline">
              {{ t('boats.new.cancel') }}
            </a>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
