import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.vue'))['default']>
    'boats/edit': ExtractProps<(typeof import('../../inertia/pages/boats/edit.vue'))['default']>
    'boats/engine_edit': ExtractProps<(typeof import('../../inertia/pages/boats/engine_edit.vue'))['default']>
    'boats/index': ExtractProps<(typeof import('../../inertia/pages/boats/index.vue'))['default']>
    'boats/new': ExtractProps<(typeof import('../../inertia/pages/boats/new.vue'))['default']>
    'boats/rig_edit': ExtractProps<(typeof import('../../inertia/pages/boats/rig_edit.vue'))['default']>
    'boats/sail_edit': ExtractProps<(typeof import('../../inertia/pages/boats/sail_edit.vue'))['default']>
    'boats/show': ExtractProps<(typeof import('../../inertia/pages/boats/show.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'design_system': ExtractProps<(typeof import('../../inertia/pages/design_system.vue'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.vue'))['default']>
    'marketing/home': ExtractProps<(typeof import('../../inertia/pages/marketing/home.vue'))['default']>
    'marketing/pricing': ExtractProps<(typeof import('../../inertia/pages/marketing/pricing.vue'))['default']>
  }
}
