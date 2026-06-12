import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'

interface FlashMessages {
  success?: string
  error?: string
}

interface UseFlashReturn {
  successMessage: ComputedRef<string | null>
  errorMessage: ComputedRef<string | null>
}

export function useFlash(): UseFlashReturn {
  const page = usePage()

  const flash = computed(() => {
    const props = page.props as Record<string, unknown>
    return (props.flash as FlashMessages | undefined) ?? {}
  })

  const successMessage = computed(() => flash.value.success ?? null)
  const errorMessage = computed(() => flash.value.error ?? null)

  return {
    successMessage,
    errorMessage,
  }
}
