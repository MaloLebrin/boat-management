<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  portId: number
  pontoon?: { id: number; name: string; description: string | null } | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const isEditing = computed(() => Boolean(props.pontoon?.id))

const form = useForm({
  name: props.pontoon?.name ?? '',
  description: props.pontoon?.description ?? '',
})

watch(
  () => props.pontoon,
  (newPontoon) => {
    form.name = newPontoon?.name ?? ''
    form.description = newPontoon?.description ?? ''
  }
)

function submit() {
  if (isEditing.value && props.pontoon) {
    form.put(`/ports/${props.portId}/pontoons/${props.pontoon.id}`, {
      onSuccess: () => emit('close'),
    })
  } else {
    form.post(`/ports/${props.portId}/pontoons`, {
      onSuccess: () => {
        form.reset()
        emit('close')
      },
    })
  }
}

function cancel() {
  form.reset()
  emit('close')
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
    <h3 class="text-sm font-semibold text-fg">
      {{ isEditing ? t('ports.pontoons.edit') : t('ports.pontoons.add') }}
    </h3>

    <form @submit.prevent="submit" class="mt-4 space-y-4">
      <BaseInput
        id="pontoon-name"
        name="name"
        :label="t('ports.pontoons.fields.name')"
        v-model="form.name"
        :errors="form.errors"
        required
      />

      <BaseTextarea
        id="pontoon-description"
        name="description"
        :label="t('ports.pontoons.fields.description')"
        v-model="form.description"
        :errors="form.errors"
        :rows="2"
      />

      <div class="flex items-center gap-3">
        <BaseButton type="submit" size="sm" :disabled="form.processing">
          {{ t('common.save') }}
        </BaseButton>
        <BaseButton type="button" variant="ghost" size="sm" @click="cancel">
          {{ t('common.cancel') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
