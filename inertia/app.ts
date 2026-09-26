import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { h, type DefineComponent } from 'vue'
import 'vue-sonner/style.css'
import { client } from '~/client'
import Layout from '~/layouts/default.vue'
import { pageTitle } from '~/utils/page_title'
import { pickVueAppFactory } from '~/utils/vue_app_factory'
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
    const createVueApp = pickVueAppFactory(el)
    createVueApp({ render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }) })
      .use(plugin)
      .mount(el)
  },
  progress: {
    color: 'var(--color-brand)',
  },
})
