import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, h, type DefineComponent } from 'vue'
import 'vue-sonner/style.css'
import { client } from '~/client'
import Layout from '~/layouts/default.vue'
import './css/app.css'

const appName = import.meta.env.VITE_APP_NAME || 'FleetAi'

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
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
  progress: {
    color: '#3cb8a2',
  },
})
