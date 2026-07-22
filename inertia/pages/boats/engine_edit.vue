<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import BoatEquipmentEngineFields from '~/components/boats/engine/BoatEquipmentEngineFields.vue'
import type { BoatEquipmentEngineFieldsModel } from '~/components/boats/engine/BoatEquipmentEngineFields.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  boat: { id: number; name: string }
  engine: BoatEquipmentEngineFieldsModel & { id: number }
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('boats.engines.editTitle')" />

  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('boats.engines.editTitle') }}</BaseHeading>
      <p class="text-base text-fg-muted">{{ boat.name }}</p>
    </div>

    <div class="mt-8">
      <Form
        :action="{ url: `/boats/${boat.id}/engines/${engine.id}`, method: 'put' }"
        #default="{ processing, errors }"
      >
        <BaseCard padded>
          <BoatEquipmentEngineFields :errors="errors" :engine="engine" />
          <div class="mt-6 flex items-center gap-3">
            <BaseButton type="submit" :disabled="processing">{{ t('common.save') }}</BaseButton>
            <a
              :href="`/boats/${boat.id}`"
              class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              {{ t('common.cancel') }}
            </a>
          </div>
        </BaseCard>
      </Form>
    </div>
  </div>
</template>
