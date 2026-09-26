import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, h, type DefineComponent } from 'vue'
import 'vue-sonner/style.css'
import { client } from '~/client'
import Layout from '~/layouts/default.vue'
import { inertiaProgressOptions } from '~/utils/inertia_progress'
import { pageTitle } from '~/utils/page_title'
import './css/app.css'

createInertiaApp({
  title: pageTitle,
  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.vue`,
      import.meta.glob<DefineComponent>('./pages/**/*.vue'),
      Layout
    )
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }) })
      .use(plugin)
      .mount(el)
  },
  // CSS de la barre bundlé dans `css/app.css` (CSP, #837) — voir `utils/inertia_progress.ts`.
  progress: inertiaProgressOptions,
})
