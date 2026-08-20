<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const page = usePage<Data.SharedProps>()

const locale = ref<string>(page.props.locale ?? 'en')

const options = [
  { label: t('settings.language.english'), value: 'en' },
  { label: t('settings.language.french'), value: 'fr' },
]
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2">{{ t('settings.language.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.language.subtitle') }}</p>
    <Form :action="{ url: '/settings/locale', method: 'put' }" #default="{ processing, errors }">
      <BaseCard>
        <BaseSelect
          v-model="locale"
          name="locale"
          :label="t('settings.language.label')"
          :options="options"
          :errors="errors"
        />
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.language.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </section>
</template>
