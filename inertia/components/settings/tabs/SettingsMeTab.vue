<script setup lang="ts">
import ProfileCard from '~/components/settings/me/ProfileCard.vue'
import SecurityCard from '~/components/settings/me/SecurityCard.vue'
import TwoFactorCard from '~/components/settings/me/TwoFactorCard.vue'
import LanguageCard from '~/components/settings/me/LanguageCard.vue'
import ThemeCard from '~/components/settings/me/ThemeCard.vue'
import type { TwoFactorSettingsProps } from '#shared/types/two_factor'

defineProps<{ twoFactor: TwoFactorSettingsProps }>()
</script>

<template>
  <div class="space-y-10">
    <ProfileCard />
    <SecurityCard />
    <TwoFactorCard :two-factor="twoFactor" />
    <LanguageCard />
    <ThemeCard />
  </div>
</template>
