<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const page = usePage<Data.SharedProps>()
const user = page.props.user
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-6">{{ t('settings.me.title') }}</BaseHeading>
    <Form :action="{ url: '/settings/profile', method: 'put' }" #default="{ processing, errors }">
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="fullName"
            :label="t('settings.me.fullNameLabel')"
            :model-value="user.fullName ?? ''"
            :placeholder="t('settings.me.fullNamePlaceholder')"
            :errors="errors"
          />
          <BaseInput
            :label="t('settings.me.emailLabel')"
            :model-value="user.email"
            disabled
            readonly
          />
          <p class="text-xs text-fg-muted">{{ t('settings.me.emailHint') }}</p>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.me.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </section>
</template>
