<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import SparePartsChatPanel from '~/components/spare_parts/chat/SparePartsChatPanel.vue'
import type { PartSearchConversationProps } from '#shared/types/spare_part_chat'
import type { SparePartsEngineProps } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: SparePartsEngineProps
  conversation: PartSearchConversationProps | null
  canManage: boolean
}>()

const { t } = useT()

const breadcrumb = computed(() => [
  { label: t('parts.index.title'), href: '/spare-parts' },
  {
    label: engineDisplayTitle(t, props.engine),
    href: `/boats/${props.boat.id}/engines/${props.engine.id}/spare-parts`,
  },
  { label: t('parts.ai.chatTitle') },
])
</script>

<template>
  <Head :title="t('parts.ai.chatTitle')" />
  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <BaseHeading level="1">{{ t('parts.ai.chatTitle') }}</BaseHeading>
    <p class="mt-1 text-sm text-fg-muted">{{ engineDisplayTitle(t, engine) }} — {{ boat.name }}</p>

    <div class="mt-6">
      <BaseCard padded>
        <SparePartsChatPanel
          :boat-id="boat.id"
          :engine="engine"
          :conversation="conversation"
          :can-manage="canManage"
        />
      </BaseCard>
    </div>
  </div>
</template>
