<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'
import type { QuotaUsage } from '../../../shared/types/plan'

const props = withDefaults(
  defineProps<{
    canAddBoat: boolean
    quota: QuotaUsage['boats']
    variant?: 'primary' | 'secondary'
  }>(),
  { variant: 'primary' }
)

const { t } = useT()
const showUpgradeModal = ref(false)

// Plan Enterprise (limit === null) : quota illimité, pas de badge « x/y ».
const showBadge = computed(() => props.quota.limit !== null)
const badgeLabel = computed(() => `${props.quota.used}/${props.quota.limit}`)

function handleClick() {
  if (props.canAddBoat) {
    router.visit('/boats/new')
  } else {
    // Au quota : le bouton reste cliquable mais ouvre l'upsell plutôt que d'échouer
    // sur un toast éphémère après une redirection (issue #418).
    showUpgradeModal.value = true
  }
}
</script>

<template>
  <span class="inline-flex" :title="canAddBoat ? undefined : t('boats.index.quotaReached')">
    <BaseButton :variant="variant" @click="handleClick">
      {{ t('boats.index.newBoat') }}
      <BaseBadge v-if="showBadge" :variant="canAddBoat ? 'neutral' : 'warning'" class="ml-1.5">
        {{ badgeLabel }}
      </BaseBadge>
    </BaseButton>
  </span>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="boats" />
</template>
