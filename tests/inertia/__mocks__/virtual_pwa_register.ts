import { ref } from 'vue'

// Stub used in Vitest — the real module is resolved by vite-plugin-pwa at build time
export function useRegisterSW(_options?: unknown) {
  return {
    offlineReady: ref(false),
    needRefresh: ref(false),
    updateServiceWorker: async () => {},
  }
}
