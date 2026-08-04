<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { PlanTier } from '../../../shared/types/plan'

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  canManageBilling: boolean
}>()

const emit = defineEmits<{ activateSubscription: [] }>()

// Le bandeau nomme le plan que l'organisation possède vraiment (#456) : lui
// proposer d'« activer l'abonnement Pro » sans le dire laissait croire qu'elle
// n'était pas Pro, alors que seul l'abonnement Stripe manque.
const planName = computed(() => t(`settings.billing.planName.${props.plan}`))
</script>

<template>
  <div class="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
    <p class="font-semibold">
      {{ t('settings.billing.noSubscription.title', { plan: planName }) }}
    </p>
    <p class="mt-1">
      {{ t('settings.billing.noSubscription.body', { plan: planName }) }}
    </p>
    <div class="mt-3">
      <BaseButton
        v-if="canManageBilling"
        variant="primary"
        size="sm"
        @click="emit('activateSubscription')"
      >
        {{ t('settings.billing.noSubscription.cta') }}
      </BaseButton>
      <p v-else>{{ t('settings.billing.noSubscription.adminOnly') }}</p>
    </div>
  </div>
</template>
