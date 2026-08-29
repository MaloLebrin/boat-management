<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BoatFormHullFields from '~/components/boats/hull/BoatFormHullFields.vue'
import { useT } from '~/composables/use_t'
import type { PortForForm, PropulsionTypeUi } from '~/types/boat_form'
import type { BoatBrandOption, BoatModelOption } from '../../../shared/types/boat_catalog'
import type { PortNameOption } from '../../../shared/types/port'

const { t } = useT()
const propulsionType = ref<PropulsionTypeUi>('')
const showSailFields = computed(() => propulsionType.value === 'sailboat')

defineProps<{
  ports: PortForForm[]
  portOptions: PortNameOption[]
  brands: BoatBrandOption[]
  catalogModels: BoatModelOption[]
  catalogBrandId: number | null
}>()
</script>

<template>
  <Head :title="t('boats.new.title')" />

  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
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
            :ports="ports"
            :port-options="portOptions"
            :brands="brands"
            :catalog-models="catalogModels"
            :catalog-brand-id="catalogBrandId"
          />

          <div class="flex items-center gap-3">
            <BaseButton type="submit" :disabled="processing">{{
              t('boats.new.submit')
            }}</BaseButton>
            <Link
              href="/boats"
              class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              {{ t('boats.new.cancel') }}
            </Link>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
