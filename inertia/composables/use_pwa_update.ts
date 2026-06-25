import { useRegisterSW } from 'virtual:pwa-register/vue'
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { useT } from '~/composables/use_t'

export function usePwaUpdate() {
  const { t } = useT()

  const { offlineReady } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Check for SW updates every hour in case the browser skips the periodic check
      setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  watch(offlineReady, (ready) => {
    if (ready) toast.success(t('pwa.offlineReady'))
  })
}
