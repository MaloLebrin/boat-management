<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { Data } from '@generated/data'

const page = usePage<Data.SharedProps>()
const { t } = useT()

const remaining = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

function tick() {
  const startedAt = page.props.demoSessionStartedAt
  const duration = page.props.demoSessionDurationMs
  if (!startedAt || !duration) {
    remaining.value = 0
    return
  }
  remaining.value = Math.max(0, duration - (Date.now() - startedAt))
}

onMounted(() => {
  tick()
  intervalId = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (intervalId !== null) clearInterval(intervalId)
})

const minutes = computed(() => Math.floor(remaining.value / 60000))
const seconds = computed(() => Math.floor((remaining.value % 60000) / 1000))
const formatted = computed(() => `${minutes.value}:${String(seconds.value).padStart(2, '0')}`)
const isUrgent = computed(() => remaining.value > 0 && remaining.value <= 2 * 60 * 1000)
const isVisible = computed(() => Boolean(page.props.demoSessionStartedAt))
</script>

<template>
  <div
    v-if="isVisible"
    role="status"
    :class="[
      'flex items-center justify-between gap-4 px-4 py-2 text-sm font-medium transition-colors',
      isUrgent ? 'bg-red-600 text-white' : 'bg-navy-700 text-navy-100',
    ]"
  >
    <span>{{ t('common.demo.banner', { time: formatted }) }}</span>
    <Form route="session.destroy">
      <BaseButton type="submit" size="sm" variant="ghost" class="text-inherit hover:text-white">
        {{ t('common.demo.exit') }}
      </BaseButton>
    </Form>
  </div>
</template>
