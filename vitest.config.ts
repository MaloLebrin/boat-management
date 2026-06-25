import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['tests/inertia/**/*.spec.ts'],
    setupFiles: ['tests/inertia/setup.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./inertia', import.meta.url)),
      '@generated': fileURLToPath(new URL('./.adonisjs/client', import.meta.url)),
      'virtual:pwa-register/vue': fileURLToPath(
        new URL('./tests/inertia/__mocks__/virtual_pwa_register.ts', import.meta.url)
      ),
    },
  },
})
