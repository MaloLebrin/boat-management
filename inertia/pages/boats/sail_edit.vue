<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentSailFields from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import type { BoatEquipmentSailFieldsModel } from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'

defineProps<{
  boat: { id: number; name: string }
  sail: BoatEquipmentSailFieldsModel & { id: number }
}>()

const { t } = useT()
</script>

<template>
  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('boats.sails.editTitle') }}</BaseHeading>
      <p class="text-base text-fg-muted">{{ boat.name }}</p>
    </div>

    <div class="mt-8">
      <Form
        :action="{ url: `/boats/${boat.id}/sails/${sail.id}`, method: 'put' }"
        #default="{ processing, errors }"
      >
        <BaseCard padded>
          <BoatEquipmentSailFields :errors="errors" :sail="sail" />
          <div class="mt-6 flex items-center gap-3">
            <BaseButton type="submit" :disabled="processing">{{ t('common.save') }}</BaseButton>
            <a :href="`/boats/${boat.id}`" class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline">
              {{ t('common.cancel') }}
            </a>
          </div>
        </BaseCard>
      </Form>
    </div>
  </div>
</template>
