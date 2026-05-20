<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  portId: number
  open: boolean
  pontoon?: { id: number; name: string; description: string | null } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useT()
const isEditing = computed(() => Boolean(props.pontoon?.id))

const form = useForm({
  name: props.pontoon?.name ?? '',
  description: props.pontoon?.description ?? '',
})

watch(
  () => props.pontoon,
  (p) => {
    form.name = p?.name ?? ''
    form.description = p?.description ?? ''
  }
)

watch(
  () => props.open,
  (isOpen) => { if (!isOpen) form.reset() }
)

function submit() {
  if (isEditing.value && props.pontoon) {
    form.put(`/ports/${props.portId}/pontoons/${props.pontoon.id}`, {
      onSuccess: () => emit('update:open', false),
    })
  } else {
    form.post(`/ports/${props.portId}/pontoons`, {
      onSuccess: () => { form.reset(); emit('update:open', false) },
    })
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEditing ? t('ports.pontoons.edit') : t('ports.pontoons.add')"
    size="md"
    @update:open="$emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput
        id="pontoon-name"
        v-model="form.name"
        name="name"
        :label="t('ports.pontoons.fields.name')"
        :errors="form.errors"
        required
      />
      <BaseTextarea
        id="pontoon-description"
        v-model="form.description"
        name="description"
        :label="t('ports.pontoons.fields.description')"
        :errors="form.errors"
        :rows="2"
      />
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="ghost" @click="$emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
