<script setup lang="ts">
import ProfileCard from '~/components/settings/me/ProfileCard.vue'
import SecurityCard from '~/components/settings/me/SecurityCard.vue'
import LanguageCard from '~/components/settings/me/LanguageCard.vue'
import ThemeCard from '~/components/settings/me/ThemeCard.vue'
</script>

<template>
  <div class="space-y-10">
    <ProfileCard />
    <SecurityCard />
    <LanguageCard />
    <ThemeCard />
  </div>
</template>
