<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'

/** Demande au gestionnaire (#890) : devient une tâche de maintenance côté équipe. */
const props = defineProps<{ boatId: number }>()

const { t } = useT()

const form = useForm({ title: '', description: '' })

function submit() {
  form.post(`/owner/boats/${props.boatId}/requests`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <BaseCard>
    <h3 class="mb-1 text-sm font-semibold text-fg">
      {{ t('owner.boats.show.requests.formTitle') }}
    </h3>
    <p class="mb-4 text-xs text-fg-muted">{{ t('owner.boats.show.requests.formHint') }}</p>
    <form class="flex flex-col gap-3" data-testid="owner-request-form" @submit.prevent="submit">
      <BaseInput
        v-model="form.title"
        name="title"
        :label="t('owner.boats.show.requests.title')"
        :placeholder="t('owner.boats.show.requests.titlePlaceholder')"
        :error="form.errors.title"
        required
      />
      <BaseTextarea
        v-model="form.description"
        name="description"
        :label="t('owner.boats.show.requests.description')"
        :error="form.errors.description"
        :rows="3"
      />
      <div class="flex justify-end">
        <BaseButton type="submit" :loading="form.processing">
          {{ t('owner.boats.show.requests.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>
