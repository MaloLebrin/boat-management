<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  portId: number
  mouillage?: { id: number; name: string; description: string | null } | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const isEditing = computed(() => Boolean(props.mouillage?.id))

const form = useForm({
  name: props.mouillage?.name ?? '',
  description: props.mouillage?.description ?? '',
})

watch(
  () => props.mouillage,
  (newMouillage) => {
    form.name = newMouillage?.name ?? ''
    form.description = newMouillage?.description ?? ''
  }
)

function submit() {
  if (isEditing.value && props.mouillage) {
    form.put(`/ports/${props.portId}/mouillages/${props.mouillage.id}`, {
      onSuccess: () => emit('close'),
    })
  } else {
    form.post(`/ports/${props.portId}/mouillages`, {
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
      {{ isEditing ? t('ports.mouillages.edit') : t('ports.mouillages.add') }}
    </h3>

    <form @submit.prevent="submit" class="mt-4 space-y-4">
      <BaseInput
        id="mouillage-name"
        name="name"
        :label="t('ports.mouillages.fields.name')"
        v-model="form.name"
        :errors="form.errors"
        required
      />

      <BaseTextarea
        id="mouillage-description"
        name="description"
        :label="t('ports.mouillages.fields.description')"
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
