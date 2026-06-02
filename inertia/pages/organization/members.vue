<script setup lang="ts">
import { computed } from 'vue'
import { router, useForm, usePage } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'

interface OrganizationMemberData {
  id: number
  userId: number
  fullName: string | null
  email: string
  role: 'admin' | 'member'
}

const props = defineProps<{
  members: OrganizationMemberData[]
  canManageMembers: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const roleOptions = computed(() => [
  { label: t('organization.members.roles.admin'), value: 'admin' },
  { label: t('organization.members.roles.member'), value: 'member' },
])

const inviteForm = useForm({
  email: '',
  role: 'member' as 'admin' | 'member',
})

function submitInvite() {
  inviteForm.post('/organization/members', {
    preserveScroll: true,
    onSuccess: () => inviteForm.reset(),
  })
}

function changeRole(memberId: number, role: string) {
  router.put(`/organization/members/${memberId}`, { role }, { preserveScroll: true })
}

function removeMember(memberId: number) {
  router.delete(`/organization/members/${memberId}`, { preserveScroll: true })
}

function getInitials(member: OrganizationMemberData): string {
  if (member.fullName) {
    return member.fullName.charAt(0).toUpperCase()
  }
  return member.email.charAt(0).toUpperCase()
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <BaseHeading level="1" class="mb-8">{{ t('organization.members.title') }}</BaseHeading>

    <!-- Flash messages -->
    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <!-- Invite form -->
    <BaseCard v-if="canManageMembers" class="mb-8">
      <template #header>
        <span class="text-sm font-semibold text-fg">{{
          t('organization.members.invite.title')
        }}</span>
      </template>
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="submitInvite">
        <div class="flex-1">
          <BaseInput
            v-model="inviteForm.email"
            name="email"
            type="email"
            :label="t('organization.members.invite.email')"
            :placeholder="t('organization.members.invite.emailPlaceholder')"
            :errors="inviteForm.errors"
            required
          />
        </div>
        <div class="w-full sm:w-48">
          <BaseSelect
            v-model="inviteForm.role"
            name="role"
            :label="t('organization.members.invite.role')"
            :options="roleOptions"
            :errors="inviteForm.errors"
          />
        </div>
        <BaseButton type="submit" variant="primary" :disabled="inviteForm.processing">
          {{ t('organization.members.invite.submit') }}
        </BaseButton>
      </form>
    </BaseCard>

    <!-- Members table -->
    <BaseCard :padded="false">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('organization.members.table.member') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('organization.members.table.role') }}
            </th>
            <th
              v-if="canManageMembers"
              class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('organization.members.table.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white"
                >
                  {{ getInitials(member) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-fg">
                    {{ member.fullName ?? t('organization.members.noName') }}
                  </p>
                  <p class="truncate text-xs text-fg-muted">{{ member.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <template v-if="canManageMembers">
                <select
                  :value="member.role"
                  class="rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  @change="changeRole(member.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="admin">{{ t('organization.members.roles.admin') }}</option>
                  <option value="member">{{ t('organization.members.roles.member') }}</option>
                </select>
              </template>
              <template v-else>
                <BaseBadge :variant="member.role === 'admin' ? 'info' : 'neutral'">
                  {{ t(`organization.members.roles.${member.role}`) }}
                </BaseBadge>
              </template>
            </td>
            <td v-if="canManageMembers" class="px-6 py-4 text-right">
              <BaseButton variant="danger" size="sm" @click="removeMember(member.id)">
                {{ t('organization.members.remove') }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
