import { onMounted, onUnmounted, ref } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  function updateStatus() {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    addEventListener('online', updateStatus)
    addEventListener('offline', updateStatus)
  })

  onUnmounted(() => {
    removeEventListener('online', updateStatus)
    removeEventListener('offline', updateStatus)
  })

  return { isOnline }
}
