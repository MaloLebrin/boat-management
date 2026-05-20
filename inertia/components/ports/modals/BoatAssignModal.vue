<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  open: boolean
  boatName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [spotIdentifier: string]
}>()

const { t } = useT()
const spotIdentifier = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      spotIdentifier.value = ''
    }
  }
)

function handleConfirm() {
  emit('confirm', spotIdentifier.value)
  spotIdentifier.value = ''
}

function handleClose(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('ports.plan.boat.assign.title', { name: boatName })"
    size="md"
    @update:open="handleClose"
  >
    <div class="space-y-4">
      <BaseInput
        id="spot-identifier"
        v-model="spotIdentifier"
        name="spotIdentifier"
        :label="t('ports.plan.boat.assign.spot')"
        :placeholder="t('ports.plan.boat.assign.spotPlaceholder')"
      />
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="handleClose(false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton @click="handleConfirm">
          {{ t('ports.plan.boat.assign.confirm') }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
