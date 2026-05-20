<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  open: boolean
  portId: number
  pontoonId?: number | null
  mouillageId?: number | null
  spot?: { id: number; name: string; description: string | null } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useT()

const form = useForm({
  name: '',
  description: '',
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.spot) {
      form.name = props.spot.name
      form.description = props.spot.description ?? ''
    } else if (isOpen) {
      form.reset()
    }
  }
)

function handleSubmit() {
  const onSuccess = () => emit('update:open', false)

  if (props.spot) {
    form.put(`/spots/${props.spot.id}`, { onSuccess })
  } else if (props.pontoonId) {
    form.post(`/ports/${props.portId}/pontoons/${props.pontoonId}/spots`, { onSuccess })
  } else if (props.mouillageId) {
    form.post(`/ports/${props.portId}/mouillages/${props.mouillageId}/spots`, { onSuccess })
  }
}

const modalTitle = props.spot ? t('ports.spots.edit') : t('ports.spots.add')
</script>

<template>
  <BaseModal
    :open="open"
    :title="spot ? t('ports.spots.edit') : t('ports.spots.add')"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput
        v-model="form.name"
        :label="t('ports.spots.fields.name')"
        :error="form.errors.name"
        required
      />
      <BaseTextarea
        v-model="form.description"
        :label="t('ports.spots.fields.description')"
        :error="form.errors.description"
        rows="3"
      />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
