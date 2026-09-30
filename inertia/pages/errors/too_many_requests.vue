<script lang="ts">
import ErrorLayout from '~/layouts/error.vue'

export default {
  layout: ErrorLayout,
}
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useT } from '~/composables/use_t'
import { useErrorPageExit } from '~/composables/use_error_page'

const props = defineProps<{
  retryAfter: number
  offerSignup: boolean
}>()

const { t } = useT()
const { href, labelKey } = useErrorPageExit('errors.tooManyRequests.home')

const remaining = ref(Math.max(0, Math.ceil(props.retryAfter)))
let timer: ReturnType<typeof setInterval> | undefined

const countdown = computed(() =>
  remaining.value > 0
    ? t('errors.tooManyRequests.retryIn', { seconds: String(remaining.value) })
    : t('errors.tooManyRequests.retryNow')
)

onMounted(() => {
  if (remaining.value <= 0) return
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      remaining.value = 0
      clearInterval(timer)
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <Head :title="t('errors.tooManyRequests.title')" />
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">429</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.tooManyRequests.title') }}</h1>
    <p class="mt-2 max-w-md text-base text-fg-muted">
      {{ t('errors.tooManyRequests.description') }}
    </p>
    <p class="mt-4 text-sm font-medium text-fg" aria-live="polite">{{ countdown }}</p>
    <div v-if="offerSignup" class="mt-6 max-w-md">
      <p class="text-base text-fg-muted">{{ t('errors.tooManyRequests.signupHint') }}</p>
      <Link href="/signup" class="mt-2 inline-block text-sm font-medium text-brand hover:underline">
        {{ t('errors.tooManyRequests.signup') }}
      </Link>
    </div>
    <Link :href="href" class="mt-4 text-sm font-medium text-brand hover:underline">
      {{ t(labelKey) }}
    </Link>
  </div>
</template>
