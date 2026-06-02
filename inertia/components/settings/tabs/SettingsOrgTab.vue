<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{
  organization: {
    id: number
    name: string
  }
}>()
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-6">{{ t('settings.org.title') }}</BaseHeading>
    <Form :action="{ url: '/settings/org', method: 'put' }" #default="{ processing, errors }">
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="name"
            :label="t('settings.org.nameLabel')"
            :model-value="organization.name"
            :placeholder="t('settings.org.namePlaceholder')"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.org.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </div>
</template>
