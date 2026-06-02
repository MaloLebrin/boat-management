<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'
export default { layout: AuthLayout }
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useForm } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'
import type { OrgRole } from '../../../shared/types/organization'

type InvitationError = 'not_found' | 'expired' | 'already_used' | null

interface InvitationDetails {
  email: string
  role: OrgRole
  orgName: string
  invitedByName: string | null
  expiresAt: string
}

const props = defineProps<{
  error: InvitationError
  invitation: InvitationDetails | null
  isAuthenticated: boolean
  token: string | null
}>()

const { t } = useT()

const form = useForm({
  token: props.token ?? '',
})

function acceptInvitation() {
  form.post('/invitations/accept', { preserveScroll: true })
}

function getRoleLabel(role: OrgRole): string {
  return t(`settings.members.roles.${role}`)
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Error: not found -->
      <BaseCard v-if="error === 'not_found'" class="text-center">
        <BaseAlert variant="danger" class="mb-4">
          {{ t('invitations.accept.error_not_found') }}
        </BaseAlert>
        <Link href="/">
          <BaseButton variant="secondary">
            {{ t('invitations.accept.decline_btn') }}
          </BaseButton>
        </Link>
      </BaseCard>

      <!-- Error: expired -->
      <BaseCard v-else-if="error === 'expired'" class="text-center">
        <BaseAlert variant="warning" class="mb-4">
          {{ t('invitations.accept.error_expired') }}
        </BaseAlert>
        <Link href="/">
          <BaseButton variant="secondary">
            {{ t('invitations.accept.decline_btn') }}
          </BaseButton>
        </Link>
      </BaseCard>

      <!-- Error: already used -->
      <BaseCard v-else-if="error === 'already_used'" class="text-center">
        <BaseAlert variant="info" class="mb-4">
          {{ t('invitations.accept.error_already_used') }}
        </BaseAlert>
        <Link href="/">
          <BaseButton variant="secondary">
            {{ t('invitations.accept.decline_btn') }}
          </BaseButton>
        </Link>
      </BaseCard>

      <!-- Valid invitation -->
      <BaseCard v-else-if="invitation" class="text-center">
        <BaseHeading level="2" class="mb-4">
          {{ t('invitations.accept.title', { orgName: invitation.orgName }) }}
        </BaseHeading>

        <p class="mb-6 text-fg-muted">
          <template v-if="invitation.invitedByName">
            {{
              t('invitations.accept.invited_by', {
                name: invitation.invitedByName,
                orgName: invitation.orgName,
                role: getRoleLabel(invitation.role),
              })
            }}
          </template>
          <template v-else>
            {{
              t('invitations.accept.invited_anonymous', {
                orgName: invitation.orgName,
                role: getRoleLabel(invitation.role),
              })
            }}
          </template>
        </p>

        <!-- Not authenticated -->
        <template v-if="!isAuthenticated">
          <BaseAlert variant="info" class="mb-4">
            {{ t('invitations.accept.login_required') }}
          </BaseAlert>
          <Link href="/auth/login">
            <BaseButton variant="primary">
              {{ t('invitations.accept.login_btn') }}
            </BaseButton>
          </Link>
        </template>

        <!-- Authenticated: show accept form -->
        <template v-else>
          <form class="space-y-4" @submit.prevent="acceptInvitation">
            <BaseButton type="submit" variant="primary" class="w-full" :disabled="form.processing">
              {{ t('invitations.accept.accept_btn') }}
            </BaseButton>
          </form>
          <div class="mt-4">
            <Link href="/">
              <BaseButton variant="secondary" class="w-full">
                {{ t('invitations.accept.decline_btn') }}
              </BaseButton>
            </Link>
          </div>
        </template>
      </BaseCard>
    </div>
  </div>
</template>
