<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { OrgRole } from '../../../../shared/types/organization'

const props = defineProps<{
  open: boolean
  memberName: string
  currentRole: OrgRole
  newRole: OrgRole | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()

const { t } = useT()

const fromLabel = computed(() => t(`settings.members.roles.${props.currentRole}`))
const toLabel = computed(() => (props.newRole ? t(`settings.members.roles.${props.newRole}`) : ''))

const impact = computed(() => {
  if (props.newRole === 'admin') return t('settings.members.roleConfirm.impactAdmin')
  if (props.newRole === 'boat_owner') return t('settings.members.roleConfirm.impactBoatOwner')
  return t('settings.members.roleConfirm.impactStaff')
})

function confirm() {
  emit('confirm')
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('settings.members.roleConfirm.title')"
    size="md"
    :close-label="t('common.cancel')"
    @update:open="emit('update:open', $event)"
  >
    <p class="text-sm text-fg">
      {{
        t('settings.members.roleConfirm.summary', {
          name: memberName,
          from: fromLabel,
          to: toLabel,
        })
      }}
    </p>
    <p class="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
      {{ impact }}
    </p>
    <Link
      v-if="newRole === 'boat_owner'"
      href="/boats"
      class="mt-3 inline-flex text-sm font-medium text-brand hover:underline"
    >
      {{ t('settings.members.roleConfirm.assignBoats') }}
    </Link>
    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" size="sm" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="sm" type="button" @click="confirm">
          {{ t('settings.members.roleConfirm.confirm') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
