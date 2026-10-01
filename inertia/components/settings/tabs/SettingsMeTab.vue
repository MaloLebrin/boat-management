<script setup lang="ts">
import ProfileCard from '~/components/settings/me/ProfileCard.vue'
import SecurityCard from '~/components/settings/me/SecurityCard.vue'
import TwoFactorCard from '~/components/settings/me/TwoFactorCard.vue'
import SessionsCard from '~/components/settings/me/SessionsCard.vue'
import LanguageCard from '~/components/settings/me/LanguageCard.vue'
import ThemeCard from '~/components/settings/me/ThemeCard.vue'
import type { TwoFactorSettingsProps } from '#shared/types/two_factor'
import type { UserSessionsSettingsProps } from '#shared/types/user_session'

defineProps<{ twoFactor: TwoFactorSettingsProps; sessions: UserSessionsSettingsProps }>()
</script>

<template>
  <div class="space-y-10">
    <ProfileCard />
    <SecurityCard />
    <TwoFactorCard :two-factor="twoFactor" />
    <SessionsCard :sessions="sessions" />
    <LanguageCard />
    <ThemeCard />
  </div>
</template>
