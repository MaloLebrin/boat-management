<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  portId: number
  open: boolean
  mouillage?: { id: number; name: string; description: string | null } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useT()
const isEditing = computed(() => Boolean(props.mouillage?.id))

const form = useForm({
  name: props.mouillage?.name ?? '',
  description: props.mouillage?.description ?? '',
})

watch(
  () => props.mouillage,
  (m) => {
    form.name = m?.name ?? ''
    form.description = m?.description ?? ''
  }
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) form.reset()
  }
)

function submit() {
  if (isEditing.value && props.mouillage) {
    form.put(`/ports/${props.portId}/mouillages/${props.mouillage.id}`, {
      onSuccess: () => emit('update:open', false),
    })
  } else {
    form.post(`/ports/${props.portId}/mouillages`, {
      onSuccess: () => {
        form.reset()
        emit('update:open', false)
      },
    })
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEditing ? t('ports.mouillages.edit') : t('ports.mouillages.add')"
    size="md"
    @update:open="$emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput
        id="mouillage-name"
        v-model="form.name"
        name="name"
        :label="t('ports.mouillages.fields.name')"
        :errors="form.errors"
        required
      />
      <BaseTextarea
        id="mouillage-description"
        v-model="form.description"
        name="description"
        :label="t('ports.mouillages.fields.description')"
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
