<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { MapPinIcon, PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import type { PortListItem } from '~/types/port'

defineProps<{
  ports: PortListItem[]
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('ports.title')" />
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between">
      <div class="space-y-2">
        <BaseHeading level="1">{{ t('ports.title') }}</BaseHeading>
      </div>
      <Link href="/ports/new">
        <BaseButton>
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.create') }}
        </BaseButton>
      </Link>
    </div>

    <!-- Empty state -->
    <div v-if="ports.length === 0" class="mt-12">
      <BaseCard padded>
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <MapPinIcon class="h-12 w-12 text-fg-muted" />
          <p class="mt-4 text-lg font-semibold text-fg">{{ t('ports.empty') }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ t('ports.emptyDescription') }}</p>
          <Link href="/ports/new" class="mt-6">
            <BaseButton>
              <PlusIcon class="h-4 w-4" />
              {{ t('ports.create') }}
            </BaseButton>
          </Link>
        </div>
      </BaseCard>
    </div>

    <!-- Ports grid -->
    <div v-else class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link v-for="port in ports" :key="port.id" :href="`/ports/${port.id}`" class="group">
        <BaseCard padded class="h-full transition-shadow hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-semibold text-fg group-hover:text-brand">
                {{ port.name }}
              </h3>
              <p v-if="port.city" class="mt-1 text-sm text-fg-muted">
                {{ port.city }}<span v-if="port.country">, {{ port.country }}</span>
              </p>
            </div>
            <MapPinIcon class="h-5 w-5 text-fg-subtle shrink-0" />
          </div>
          <div class="mt-4 flex items-center gap-4 text-sm text-fg-muted">
            <span>{{ port.pontoonCount }} {{ t('ports.pontoons.title').toLowerCase() }}</span>
            <span>{{ port.boatCount }} {{ t('nav.boats').toLowerCase() }}</span>
          </div>
        </BaseCard>
      </Link>
    </div>
  </div>
</template>
