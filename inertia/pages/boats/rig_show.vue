<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import RigShowTabInfo from '~/components/boats/rig/show/tabs/RigShowTabInfo.vue'
import RigShowTabPhotos from '~/components/boats/rig/show/tabs/RigShowTabPhotos.vue'
import { useT } from '~/composables/use_t'
import type { BoatRigDetail } from '~/types/boat_show'

const { t } = useT()

defineProps<{
  boat: { id: number; name: string }
  rig: BoatRigDetail
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
  <Head :title="t(`boats.options.rigType.${rig.rigType}`)" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        {
          label: t('boats.engineShow.breadcrumb.equipment'),
          href: `/boats/${boat.id}?tab=equipment`,
        },
        { label: t('boats.rigShow.title') },
      ]"
    />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ t(`boats.options.rigType.${rig.rigType}`) }}</BaseHeading>
            <BaseBadge :variant="statusVariant(rig.status)">
              {{ t(`equipment.status.${rig.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}?tab=equipment`">
            ← {{ t('boats.rigShow.back') }}
          </BaseButton>
          <BaseButton v-if="canManage" size="sm" :href="`/boats/${boat.id}/rig/edit`">
            {{ t('boats.rigShow.edit') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'info', label: t('boats.rigShow.tabs.info') },
          {
            key: 'photos',
            label: t('boats.rigShow.tabs.photos'),
            badge: String(rig.photos.length || ''),
          },
        ]"
      />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <RigShowTabInfo v-if="tab === 'info'" :rig="rig" />
        <RigShowTabPhotos v-else :boat="boat" :rig="rig" :can-manage="canManage" />
      </div>
    </Transition>
  </div>
</template>
