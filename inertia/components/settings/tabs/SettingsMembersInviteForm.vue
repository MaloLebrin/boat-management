<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import { useT } from '~/composables/use_t'
import type { OrgRole } from '../../../../shared/types/organization'

defineProps<{
  boatOptions: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const form = useForm({
  email: '',
  role: 'member' as OrgRole,
  boatIds: [] as number[],
})

const roleOptions = computed(() => [
  { label: t('settings.members.roles.admin'), value: 'admin' },
  { label: t('settings.members.roles.member'), value: 'member' },
  { label: t('settings.members.roles.mechanic'), value: 'mechanic' },
  { label: t('settings.members.roles.boat_owner'), value: 'boat_owner' },
])

function toggleBoat(boatId: number, checked: boolean) {
  form.boatIds = checked ? [...form.boatIds, boatId] : form.boatIds.filter((id) => id !== boatId)
}

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
    <form class="flex flex-col gap-4" @submit.prevent="submitInvite">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
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
          <BaseButton type="submit" variant="primary" :disabled="form.processing">
            {{ t('settings.members.inviteForm.submit') }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="emit('close')">
            {{ t('settings.members.inviteForm.cancel') }}
          </BaseButton>
        </div>
      </div>

      <div v-if="form.role === 'boat_owner'" class="border-t border-border pt-4">
        <p class="mb-2 text-sm font-medium text-fg">
          {{ t('settings.members.inviteForm.boats') }}
        </p>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <BaseCheckbox
            v-for="boat in boatOptions"
            :key="boat.id"
            :model-value="form.boatIds.includes(boat.id)"
            @update:model-value="toggleBoat(boat.id, $event)"
          >
            {{ boat.name }}
          </BaseCheckbox>
        </div>
        <p v-if="form.errors.boatIds" class="mt-1 text-xs text-danger">
          {{ form.errors.boatIds }}
        </p>
      </div>
    </form>
  </BaseCard>
</template>
