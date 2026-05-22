<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/useT'
import type { OrgRole } from '../../../../shared/types/organization'

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const form = useForm({
  email: '',
  role: 'member' as OrgRole,
})

const roleOptions = computed(() => [
  { label: t('settings.members.roles.admin'), value: 'admin' },
  { label: t('settings.members.roles.member'), value: 'member' },
])

function submitInvite() {
  form.post('/organization/invitations', {
    preserveScroll: true,
    onSuccess: () => {
      form.reset()
      emit('close')
    },
  })
}
</script>

<template>
  <BaseCard class="mb-6">
    <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="submitInvite">
      <div class="flex-1">
        <BaseInput
          v-model="form.email"
          name="email"
          type="email"
          :label="t('settings.members.inviteForm.email')"
          :placeholder="t('settings.members.inviteForm.emailPlaceholder')"
          :errors="form.errors"
          required
        />
      </div>
      <div class="w-full sm:w-48">
        <BaseSelect
          v-model="form.role"
          name="role"
          :label="t('settings.members.inviteForm.role')"
          :options="roleOptions"
          :errors="form.errors"
        />
      </div>
      <div class="flex gap-2">
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="form.processing"
        >
          {{ t('settings.members.inviteForm.submit') }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="secondary"
          @click="emit('close')"
        >
          {{ t('settings.members.inviteForm.cancel') }}
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>
