<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import SailShowTabInfo from '~/components/boats/sail/show/tabs/SailShowTabInfo.vue'
import SailShowTabPhotos from '~/components/boats/sail/show/tabs/SailShowTabPhotos.vue'
import { useT } from '~/composables/use_t'
import type { BoatSailDetail } from '~/types/boat_show'

const { t } = useT()

defineProps<{
  boat: { id: number; name: string }
  sail: BoatSailDetail
  canManage: boolean
}>()

type TabKey = 'info' | 'photos'
const tab = ref<TabKey>('info')

onMounted(() => {
  const fromUrl = new URLSearchParams(window.location.search).get('tab') as TabKey | null
  if (fromUrl === 'photos') tab.value = fromUrl
})

watch(tab, (newTab) => {
  const url = new URL(window.location.href)
  if (newTab === 'info') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', newTab)
  }
  window.history.replaceState(window.history.state, '', url.pathname + url.search)
})

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}
</script>

<template>
  <Head :title="t(`boats.options.sailType.${sail.sailType}`)" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        {
          label: t('boats.engineShow.breadcrumb.equipment'),
          href: `/boats/${boat.id}?tab=equipment`,
        },
        { label: t(`boats.options.sailType.${sail.sailType}`) },
      ]"
    />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ t(`boats.options.sailType.${sail.sailType}`) }}</BaseHeading>
            <BaseBadge :variant="statusVariant(sail.status)">
              {{ t(`equipment.status.${sail.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}?tab=equipment`">
            ← {{ t('boats.sailShow.back') }}
          </BaseButton>
          <BaseButton v-if="canManage" size="sm" :href="`/boats/${boat.id}/sails/${sail.id}/edit`">
            {{ t('boats.sailShow.edit') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'info', label: t('boats.sailShow.tabs.info') },
          {
            key: 'photos',
            label: t('boats.sailShow.tabs.photos'),
            badge: String(sail.photos.length || ''),
          },
        ]"
      />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <SailShowTabInfo v-if="tab === 'info'" :sail="sail" />
        <SailShowTabPhotos v-else :boat="boat" :sail="sail" :can-manage="canManage" />
      </div>
    </Transition>
  </div>
</template>
